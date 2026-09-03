// ------------------------------------------------
// billsRoutes.js
// All bill payment endpoints.
// Uses providerService to resolve correct adapter.
// Fully dynamic - no hardcoded provider calls.
// ------------------------------------------------

const express = require('express');
const router = express.Router();
const { isAuth } = require('../middleware/auth');

const {
  response,
  checkWalletBalance,
  deductWallet,
  refundWallet,
  finalizeBillTransaction,
  generateReference,
} = require('../services/billsService');

const {
  resolveAdapter,
  getNetwork,
  getNetworks,
  checkServiceStatus,
} = require('../services/providerService');

const BillsTransaction = require('../models/BillsTransaction');
const BillsServiceConfig = require('../models/BillsServiceConfig');

// ------------------------------------------------
// GET /api/bills_services_status
// Returns current status of all bill services
// Public endpoint - no auth required
// ------------------------------------------------
router.get('/bills_services_status', async (req, res) => {
  try {
    const configs = await BillsServiceConfig.find();
    const services = {};
    configs.forEach((c) => {
      services[c.service_type] = c.status;
    });

    // Default all to active if no config yet
    const defaults = ['airtime', 'data', 'electricity', 'tv_subscription', 'exam_cards'];
    defaults.forEach((s) => {
      if (!services[s]) services[s] = 'active';
    });

    return res.json({ msg: '200', status: '200', services });
  } catch (error) {
    console.log('Bills status error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch service status.' });
  }
});

// ------------------------------------------------
// GET /api/bills/config
// Returns all active services and their networks
// Mobile app calls this to build UI dynamically
// ------------------------------------------------
router.get('/bills/config', async (req, res) => {
  try {
    const configs = await BillsServiceConfig.find()
      .populate('active_provider_id', 'name slug supported_services status');

    const result = {};
    for (const config of configs) {
      const networks = await getNetworks(config.service_type);
      result[config.service_type] = {
        status: config.status,
        provider: config.active_provider_id?.name || 'VTUGate',
        networks: networks.map((n) => ({
          id: n.network_name,
          name: n.display_name,
          service_id: n.service_id,
          mode: n.mode,
          extra: n.extra_params,
        })),
      };
    }

    return res.json({ msg: '200', status: '200', config: result });
  } catch (error) {
    console.log('Bills config error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch bills config.' });
  }
});

// ------------------------------------------------
// GET /api/bills/networks/:service_type
// Get active networks for a service type
// Used by mobile app to populate dropdowns
// ------------------------------------------------
router.get('/bills/networks/:service_type', async (req, res) => {
  try {
    const { service_type } = req.params;
    const networks = await getNetworks(service_type);

    return res.json({
      msg: '200',
      status: '200',
      networks: networks.map((n) => ({
        id: n.network_name,
        name: n.display_name,
        service_id: n.service_id,
        mode: n.mode,
        extra: n.extra_params,
        commission_value: n.commission_value,
      })),
    });
  } catch (error) {
    console.log('Get networks error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch networks.' });
  }
});

// ------------------------------------------------
// GET /api/bills/plans/data/:service_id
// Get data plans for a network service_id
// Calls active provider dynamically
// ------------------------------------------------
// GET /api/bills/plans/data/:service_id
// Get data plans by service_id directly
router.get('/bills/plans/data/:service_id', async (req, res) => {
  try {
    const { service_id } = req.params;
    const { adapter } = await resolveAdapter('data');
    const result = await adapter.fetchDataPlans(service_id);

    if (!result.success) {
      return res.json({ msg: '400', message: result.message });
    }

    return res.json({
      msg: '200',
      status: '200',
      plans: result.plans,
    });
  } catch (error) {
    console.log('Get data plans error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch data plans.' });
  }
});

// GET /api/bills/plans/:service_type/:network
// Get plans by network name and optional data type
// e.g. /api/bills/plans/data/mtn?type=sme
// Mobile app uses this — no service_id needed
router.get('/bills/plans/:service_type/:network', async (req, res) => {
  try {
    const { service_type, network } = req.params;
    const { type } = req.query;

    // Build network key to match DB
    const networkKey = type
      ? `${network.toLowerCase()}_${type.toLowerCase()}`
      : network.toLowerCase();

    // Get provider for this service
    const { adapter, provider } = await resolveAdapter(service_type);

    // Find matching network in DB
    const BillsProviderNetwork = require('../models/BillsProviderNetwork');
    const query = {
      service_type,
      status: 'active',
    };
    if (provider?._id) query.provider_id = provider._id;

    // Try exact match first
    let networkConfig = await BillsProviderNetwork.findOne({
      ...query,
      network_name: networkKey,
    });

    // If no exact match try just network name
    if (!networkConfig) {
      networkConfig = await BillsProviderNetwork.findOne({
        ...query,
        network_name: network.toLowerCase(),
      });
    }

    if (!networkConfig) {
      return res.json({
        msg: '404',
        message: `No plans found for ${network}${type ? ` (${type})` : ''}.`,
      });
    }

    // Fetch live plans from provider
    const result = await adapter.fetchDataPlans(networkConfig.service_id);

    if (!result.success) {
      return res.json({ msg: '400', message: result.message });
    }

    return res.json({
      msg: '200',
      status: '200',
      network,
      type: type || null,
      service_id: networkConfig.service_id,
      plans: result.plans,
    });
  } catch (error) {
    console.log('Get plans error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch plans.' });
  }
});

// ------------------------------------------------
// POST /api/bills/buy_airtime
// Purchase airtime for any network
// ------------------------------------------------
router.post('/bills/buy_airtime', isAuth, async (req, res) => {
  try {
    const { userId, tag_id, network, phone, amount } = req.body;

    if (!userId || !network || !phone || !amount) {
      return res.json(response.error('Missing required fields.'));
    }

    // 1. Check service status
    const statusCheck = await checkServiceStatus('airtime');
    if (!statusCheck.ok) return res.json(statusCheck.response);

    // 2. Check wallet balance
    const walletCheck = await checkWalletBalance(userId, amount);
    if (!walletCheck.ok) return res.json(walletCheck.response);
    const { user, balance: balanceBefore } = walletCheck;

    // 3. Resolve provider + get service_id
    const { adapter, provider } = await resolveAdapter('airtime');
    const networkConfig = await getNetwork('airtime', network, provider?._id);
    const service_id = networkConfig?.service_id || null;

    if (!service_id) {
      return res.json(response.error(`Network ${network} not available.`));
    }

    // 4. Generate reference
    const reference = generateReference('AIR');

    // 5. Deduct wallet
    const deduction = await deductWallet(userId, amount);
    if (!deduction.ok) return res.json(response.error('Could not process payment.'));

    // 6. Call provider
    const providerResult = await adapter.buyAirtime({
      service_id,
      phone_number: phone,
      amount,
      reference,
    });

    // 7. If provider failed — refund wallet
    if (!providerResult.success) {
      await refundWallet(userId, amount);
      return res.json(response.error(providerResult.message));
    }

    const balanceAfter = deduction.balance_after;

    // 8. Finalize
    const { coins_earned } = await finalizeBillTransaction({
      userId,
      tag_id,
      user,
      service_type: 'airtime',
      service_title: `${network.toUpperCase()} Airtime`,
      provider: provider?.name || 'VTUGate',
      amount,
      wallet_balance_before: balanceBefore,
      wallet_balance_after: balanceAfter,
      reference,
      provider_reference: providerResult.reference,
      provider_response: providerResult.data,
      phone_number: phone,
      network,
    });

    return res.json(response.success('Airtime purchased successfully.', {
      reference,
      amount,
      network,
      phone,
      balance: balanceAfter,
      coins_earned,
    }));
  } catch (error) {
    console.log('Buy airtime error:', error.message);
    return res.json(response.error('Airtime purchase failed. Please try again.'));
  }
});

// ------------------------------------------------
// POST /api/bills/buy_data
// Purchase mobile data bundle
// ------------------------------------------------
router.post('/bills/buy_data', isAuth, async (req, res) => {
  try {
    const {
      userId, tag_id, network, network_name,
      phone, service_id, plan_code, plan_name, amount,
    } = req.body;

    if (!userId || !network || !phone || !service_id || !plan_code || !amount) {
      return res.json(response.error('Missing required fields.'));
    }

    // 1. Check service status
    const statusCheck = await checkServiceStatus('data');
    if (!statusCheck.ok) return res.json(statusCheck.response);

    // 2. Check wallet balance
    const walletCheck = await checkWalletBalance(userId, amount);
    if (!walletCheck.ok) return res.json(walletCheck.response);
    const { user, balance: balanceBefore } = walletCheck;

    // 3. Resolve provider
    const { adapter, provider } = await resolveAdapter('data');

    // 4. Generate reference
    const reference = generateReference('DATA');

    // 5. Deduct wallet
    const deduction = await deductWallet(userId, amount);
    if (!deduction.ok) return res.json(response.error('Could not process payment.'));

    // 6. Call provider
    const providerResult = await adapter.buyData({
      service_id,
      phone_number: phone,
      plan_code,
      amount,
      reference,
    });

    // 7. Refund if failed
    if (!providerResult.success) {
      await refundWallet(userId, amount);
      return res.json(response.error(providerResult.message));
    }

    const balanceAfter = deduction.balance_after;

    // 8. Finalize
    const { coins_earned } = await finalizeBillTransaction({
      userId,
      tag_id,
      user,
      service_type: 'data',
      service_title: `${network_name || network} Mobile Data`,
      provider: provider?.name || 'VTUGate',
      amount,
      wallet_balance_before: balanceBefore,
      wallet_balance_after: balanceAfter,
      reference,
      provider_reference: providerResult.reference,
      provider_response: providerResult.data,
      phone_number: phone,
      network,
      data_plan: plan_name || plan_code,
    });

    return res.json(response.success('Data purchased successfully.', {
      reference,
      amount,
      network,
      phone,
      plan: plan_name,
      balance: balanceAfter,
      coins_earned,
    }));
  } catch (error) {
    console.log('Buy data error:', error.message);
    return res.json(response.error('Data purchase failed. Please try again.'));
  }
});

// ------------------------------------------------
// POST /api/bills/verify_meter
// Verify electricity meter before purchase
// ------------------------------------------------
router.post('/bills/verify_meter', isAuth, async (req, res) => {
  try {
    const { service_id, meter_no, disco } = req.body;

    if (!service_id || !meter_no || !disco) {
      return res.json(response.error('Missing required fields.'));
    }

    const { adapter } = await resolveAdapter('electricity');
    const result = await adapter.verifyElectricity({ service_id, meter_no, disco });

    if (!result.success) {
      return res.json(response.error(result.message));
    }

    return res.json({
      msg: '200',
      status: '200',
      customer_name: result.customer_name,
      address: result.address,
    });
  } catch (error) {
    console.log('Verify meter error:', error.message);
    return res.json(response.error('Meter verification failed. Please try again.'));
  }
});

// ------------------------------------------------
// POST /api/bills/buy_electricity
// Purchase electricity token
// ------------------------------------------------
router.post('/bills/buy_electricity', isAuth, async (req, res) => {
  try {
    const {
      userId, tag_id, service_id, disco, disco_name,
      meter_no, amount, phone_number, customer_name,
    } = req.body;

    if (!userId || !service_id || !disco || !meter_no || !amount || !phone_number) {
      return res.json(response.error('Missing required fields.'));
    }

    // 1. Check service status
    const statusCheck = await checkServiceStatus('electricity');
    if (!statusCheck.ok) return res.json(statusCheck.response);

    // 2. Check wallet balance
    const walletCheck = await checkWalletBalance(userId, amount);
    if (!walletCheck.ok) return res.json(walletCheck.response);
    const { user, balance: balanceBefore } = walletCheck;

    // 3. Resolve provider
    const { adapter, provider } = await resolveAdapter('electricity');

    // 4. Generate reference
    const reference = generateReference('ELEC');

    // 5. Deduct wallet
    const deduction = await deductWallet(userId, amount);
    if (!deduction.ok) return res.json(response.error('Could not process payment.'));

    // 6. Call provider
    const providerResult = await adapter.buyElectricity({
      service_id,
      meter_no,
      disco,
      amount,
      phone_number,
      reference,
    });

    // 7. Refund if failed
    if (!providerResult.success) {
      await refundWallet(userId, amount);
      return res.json(response.error(providerResult.message));
    }

    const balanceAfter = deduction.balance_after;

    // 8. Finalize
    const { coins_earned } = await finalizeBillTransaction({
      userId,
      tag_id,
      user,
      service_type: 'electricity',
      service_title: `${disco_name || disco.toUpperCase()} Electricity`,
      provider: provider?.name || 'VTUGate',
      amount,
      wallet_balance_before: balanceBefore,
      wallet_balance_after: balanceAfter,
      reference,
      provider_reference: providerResult.reference,
      provider_response: providerResult.data,
      meter_number: meter_no,
      disco_code: disco,
      meter_type: 'prepaid',
      customer_name: customer_name || '',
      token_delivered: providerResult.token || '',
    });

    return res.json(response.success('Electricity token purchased successfully.', {
      reference,
      amount,
      token: providerResult.token || '',
      units: providerResult.units || '',
      meter_number: meter_no,
      disco,
      balance: balanceAfter,
      coins_earned,
    }));
  } catch (error) {
    console.log('Buy electricity error:', error.message);
    return res.json(response.error('Electricity purchase failed. Please try again.'));
  }
});

// ------------------------------------------------
// POST /api/bills/verify_tv
// Verify TV smartcard - also returns bouquets
// ------------------------------------------------
router.post('/bills/verify_tv', isAuth, async (req, res) => {
  try {
    const { service_id, smartcard_number, phone } = req.body;

    if (!service_id || !smartcard_number) {
      return res.json(response.error('Missing required fields.'));
    }

    const { adapter } = await resolveAdapter('tv_subscription');
    const result = await adapter.verifyTV({
      service_id,
      smartcard_number,
      phone: phone || '08000000000',
    });

    if (!result.success) {
      return res.json(response.error(result.message));
    }

    return res.json({
      msg: '200',
      status: '200',
      customer_name: result.customer_name,
      bouquets: result.bouquets,
    });
  } catch (error) {
    console.log('Verify TV error:', error.message);
    return res.json(response.error('Smartcard verification failed. Please try again.'));
  }
});

// ------------------------------------------------
// POST /api/bills/buy_tv
// Purchase TV subscription
// ------------------------------------------------
router.post('/bills/buy_tv', isAuth, async (req, res) => {
  try {
    const {
      userId, tag_id, service_id, provider_name,
      smartcard_number, phone, plan_code, plan_name,
      amount, customer_name,
    } = req.body;

    if (!userId || !service_id || !smartcard_number || !plan_code || !amount) {
      return res.json(response.error('Missing required fields.'));
    }

    // 1. Check service status
    const statusCheck = await checkServiceStatus('tv_subscription');
    if (!statusCheck.ok) return res.json(statusCheck.response);

    // 2. Check wallet balance
    const walletCheck = await checkWalletBalance(userId, amount);
    if (!walletCheck.ok) return res.json(walletCheck.response);
    const { user, balance: balanceBefore } = walletCheck;

    // 3. Resolve provider
    const { adapter, provider } = await resolveAdapter('tv_subscription');

    // 4. Generate reference
    const reference = generateReference('TV');

    // 5. Deduct wallet
    const deduction = await deductWallet(userId, amount);
    if (!deduction.ok) return res.json(response.error('Could not process payment.'));

    // 6. Call provider
    const providerResult = await adapter.buyTV({
      service_id,
      smartcard_number,
      phone: phone || '08000000000',
      amount,
      plan_code,
      plan_name,
      reference,
    });

    // 7. Refund if failed
    if (!providerResult.success) {
      await refundWallet(userId, amount);
      return res.json(response.error(providerResult.message));
    }

    const balanceAfter = deduction.balance_after;

    // 8. Finalize
    const { coins_earned } = await finalizeBillTransaction({
      userId,
      tag_id,
      user,
      service_type: 'tv_subscription',
      service_title: `${provider_name || 'TV'} Subscription - ${plan_name}`,
      provider: provider?.name || 'VTUGate',
      amount,
      wallet_balance_before: balanceBefore,
      wallet_balance_after: balanceAfter,
      reference,
      provider_reference: providerResult.reference,
      provider_response: providerResult.data,
      smartcard_number,
      customer_name: customer_name || '',
      bouquet: plan_name || plan_code,
    });

    return res.json(response.success('TV subscription activated successfully.', {
      reference,
      amount,
      plan: plan_name,
      smartcard_number,
      balance: balanceAfter,
      coins_earned,
    }));
  } catch (error) {
    console.log('Buy TV error:', error.message);
    return res.json(response.error('TV subscription failed. Please try again.'));
  }
});

// ------------------------------------------------
// POST /api/bills/buy_exam_cards
// Purchase exam scratch card pins
// ------------------------------------------------
router.post('/bills/buy_exam_cards', isAuth, async (req, res) => {
  try {
    const {
      userId, tag_id, service_id, exam_type, exam_label,
      quantity, phone, email, amount,
    } = req.body;

    if (!userId || !service_id || !exam_type || !quantity || !phone || !email || !amount) {
      return res.json(response.error('Missing required fields.'));
    }

    // 1. Check service status
    const statusCheck = await checkServiceStatus('exam_cards');
    if (!statusCheck.ok) return res.json(statusCheck.response);

    // 2. Check wallet balance
    const walletCheck = await checkWalletBalance(userId, amount);
    if (!walletCheck.ok) return res.json(walletCheck.response);
    const { user, balance: balanceBefore } = walletCheck;

    // 3. Resolve provider
    const { adapter, provider } = await resolveAdapter('exam_cards');

    // 4. Generate reference
    const reference = generateReference('EXAM');

    // 5. Deduct wallet
    const deduction = await deductWallet(userId, amount);
    if (!deduction.ok) return res.json(response.error('Could not process payment.'));

    // 6. Call provider
    const providerResult = await adapter.buyExamCard({
      service_id,
      quantity: Number(quantity),
      phone,
      email,
      reference,
    });

    // 7. Refund if failed
    if (!providerResult.success) {
      await refundWallet(userId, amount);
      return res.json(response.error(providerResult.message));
    }

    const balanceAfter = deduction.balance_after;

    // 8. Finalize
    const { coins_earned } = await finalizeBillTransaction({
      userId,
      tag_id,
      user,
      service_type: 'exam_cards',
      service_title: `${exam_label || exam_type} Scratch Card`,
      provider: provider?.name || 'VTUGate',
      amount,
      wallet_balance_before: balanceBefore,
      wallet_balance_after: balanceAfter,
      reference,
      provider_reference: providerResult.reference,
      provider_response: providerResult.data,
      exam_type,
      quantity: Number(quantity),
      delivery_phone: phone,
      delivery_email: email,
      pins_delivered: providerResult.pins || [],
    });

    return res.json(response.success('Exam card purchased successfully.', {
      reference,
      amount,
      exam_type,
      quantity,
      pins: providerResult.pins || [],
      balance: balanceAfter,
      coins_earned,
    }));
  } catch (error) {
    console.log('Buy exam cards error:', error.message);
    return res.json(response.error('Exam card purchase failed. Please try again.'));
  }
});

// ------------------------------------------------
// GET /api/bills/history/:userId
// Get bills transaction history for a user
// ------------------------------------------------
router.get('/bills/history/:userId', isAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      BillsTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BillsTransaction.countDocuments({ userId }),
    ]);

    return res.json({
      msg: '200',
      status: '200',
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.log('Bills history error:', error.message);
    return res.json(response.error('Could not fetch bills history.'));
  }
});

module.exports = router;

