
// -------------------------------------------------
// Bills Service
// Reusable helper functions for all bill payment
// routes. Every bill payment route uses these
// functions — zero code duplication across routes.
// -------------------------------------------------

const User = require('../models/User');
const BillsTransaction = require('../models/BillsTransaction');
const BillsServiceStatus = require('../models/BillsServiceStatus');
const FundTransfer = require('../models/fundTransfer');
const { creditCoins } = require('./rewardsService');
const { processPromoterBonus } = require('./referralService');
const {
  processSignupBonus,
  processReferralBonus: processReferralBonusNew,
} = require('./bonusService');
const sendEmail = require('./emailService');
const { getAppSettings } = require('./appSettingService');
const { loginEmail } = require('../emailTemplate/emailLogin');



// Generate unique transaction reference
const generateReference = (prefix = 'BILL') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// -- Bill payment confirmation email ---------------
// -- Bill payment confirmation email ---------------
const sendBillPaymentEmail = async ({
  email,
  name,
  service_title,
  amount,
  reference,
  balance,
  coins_earned,
}) => {
  try {
    const appSettings = await getAppSettings();
    const APP_NAME = appSettings?.app_name || 'Ota Mobile';
    const APP_LOGO = appSettings?.app_logo || '';
    const APP_EMAIL = appSettings?.app_email || 'noreply@ota.com';

    const logoImage = APP_LOGO
      ? `<img src="${APP_LOGO}" alt="${APP_NAME}" style="height:40px; width:40px; border-radius:8px; object-fit:cover;" />`
      : '';

    const message = `
      Your <strong>${service_title}</strong> payment was successful.<br/><br/>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:8px 0; color:#6B7280; font-size:14px;">Service</td><td style="padding:8px 0; font-weight:700; text-align:right;">${service_title}</td></tr>
        <tr style="border-top:1px solid #E5E7EB;"><td style="padding:8px 0; color:#6B7280; font-size:14px;">Amount</td><td style="padding:8px 0; font-weight:700; text-align:right; color:#10B981;">₦${Number(amount).toLocaleString()}</td></tr>
        <tr style="border-top:1px solid #E5E7EB;"><td style="padding:8px 0; color:#6B7280; font-size:14px;">Reference</td><td style="padding:8px 0; font-weight:700; text-align:right; font-size:12px;">${reference}</td></tr>
        <tr style="border-top:1px solid #E5E7EB;"><td style="padding:8px 0; color:#6B7280; font-size:14px;">New Balance</td><td style="padding:8px 0; font-weight:700; text-align:right;">₦${Number(balance).toLocaleString()}</td></tr>
        ${coins_earned > 0 ? `<tr style="border-top:1px solid #E5E7EB;"><td style="padding:8px 0; color:#6B7280; font-size:14px;">Coins Earned</td><td style="padding:8px 0; font-weight:700; text-align:right; color:#4C5FD5;">+${coins_earned} coins 🎉</td></tr>` : ''}
      </table>
    `;

    const html = loginEmail(
      APP_NAME,
      `${service_title} Payment Successful`,
      name,
      message,
      logoImage
    );

    await sendEmail({
      from: { name: `${APP_NAME} Payments`, email: `<${APP_EMAIL}>` },
      to: [{ email }],
      subject: `${service_title} Payment Successful - ${APP_NAME}`,
      html,
      text: `Your ${service_title} payment of NGN${Number(amount).toLocaleString()} was successful. Reference: ${reference}`,
    });
  } catch (error) {
    console.log('sendBillPaymentEmail error:', error.message);
  }
};

// -- Standard response builders --------------------
const response = {
  success: (message, data = {}) => ({
    msg: '200',
    status: '200',
    message,
    ...data,
  }),
  error: (message, status = '400') => ({
    msg: status,
    status,
    message,
  }),
  insufficientBalance: () => ({
    msg: '403',
    status: '403',
    message: 'Insufficient wallet balance. Please fund your account.',
  }),
  serviceUnavailable: (service) => ({
    msg: '503',
    status: '503',
    message: `${service} service is currently unavailable. Please try again later.`,
  }),
  servicePaused: (service) => ({
    msg: '503',
    status: '503',
    message: `${service} service is currently under maintenance. Please try again later.`,
  }),
};

// -- Get or create service status document ---------
const getServiceStatus = async () => {
  let status = await BillsServiceStatus.findOne();
  if (!status) {
    status = await BillsServiceStatus.create({});
  }
  return status;
};

// -- Check if a specific service is active ---------
// Returns { ok: true } if active
// Returns { ok: false, response: {...} } if not
const checkServiceStatus = async (serviceName) => {
  try {
    const status = await getServiceStatus();
    const serviceStatus = status[serviceName];

    if (serviceStatus === 'hidden' || serviceStatus === 'paused') {
      return {
        ok: false,
        response: serviceStatus === 'paused'
          ? response.servicePaused(serviceName)
          : response.serviceUnavailable(serviceName),
      };
    }
    return { ok: true };
  } catch (error) {
    console.log('Check service status error:', error.message);
    return { ok: true }; // fail open — don't block user if status check fails
  }
};

// -- Find user and validate wallet balance ---------
// Returns { ok: true, user } if sufficient
// Returns { ok: false, response: {...} } if not
const checkWalletBalance = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return {
        ok: false,
        response: response.error('User account not found.', '404'),
      };
    }

    const balance = Number(user.amount || 0);
    const required = Number(amount);

    if (balance < required) {
      return {
        ok: false,
        user,
        response: response.insufficientBalance(),
      };
    }

    return { ok: true, user, balance };
  } catch (error) {
    console.log('Check wallet error:', error.message);
    return {
      ok: false,
      response: response.error('Could not verify wallet balance.'),
    };
  }
};

// -- Deduct wallet balance -------------------------
const deductWallet = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    const currentBalance = Number(user.amount || 0);
    const newBalance = currentBalance - Number(amount);
    await User.findByIdAndUpdate(userId, { amount: newBalance.toFixed(2) });
    return { ok: true, balance_before: currentBalance, balance_after: newBalance };
  } catch (error) {
    console.log('Deduct wallet error:', error.message);
    return { ok: false };
  }
};

// -- Refund wallet (called if provider fails) ------
const refundWallet = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    const currentBalance = Number(user.amount || 0);
    const newBalance = currentBalance + Number(amount);
    await User.findByIdAndUpdate(userId, { amount: newBalance.toFixed(2) });
    return { ok: true };
  } catch (error) {
    console.log('Refund wallet error:', error.message);
    return { ok: false };
  }
};

// -- Save bills transaction record -----------------
const saveBillsTransaction = async ({
  userId,
  tag_id,
  service_type,
  service_title,
  provider,
  amount,
  fee = 0,
  wallet_balance_before,
  wallet_balance_after,
  status = 'success',
  reference,
  provider_reference = '',
  provider_response = {},
  // Optional service fields
  phone_number = '',
  meter_number = '',
  disco_code = '',
  meter_type = '',
  smartcard_number = '',
  customer_name = '',
  bouquet = '',
  network = '',
  data_plan = '',
  exam_type = '',
  quantity = 1,
  delivery_phone = '',
  delivery_email = '',
  pins_delivered = [],
  token_delivered = '',
}) => {
  try {
    const transaction = await BillsTransaction.create({
      userId,
      tag_id,
      service_type,
      service_title,
      provider,
      amount: Number(amount),
      fee: Number(fee),
      total_amount: Number(amount) + Number(fee),
      wallet_balance_before,
      wallet_balance_after,
      status,
      reference,
      provider_reference,
      provider_response,
      phone_number,
      meter_number,
      disco_code,
      meter_type,
      smartcard_number,
      customer_name,
      bouquet,
      network,
      data_plan,
      exam_type,
      quantity,
      delivery_phone,
      delivery_email,
      pins_delivered,
      token_delivered,
    });
    return { ok: true, transaction };
  } catch (error) {
    console.log('Save transaction error:', error.message);
    return { ok: false };
  }
};

// -- Save to fund_transfer for history visibility --
const saveToTransferHistory = async ({
  userId,
  tag_id,
  user_name,
  service_title,
  service_type,
  provider,
  amount,
  reference,
  wallet_balance_after,
}) => {
  try {
    const now = new Date();

    // Build category label dynamically per service type
    const categoryMap = {
      airtime: 'Bills Payment | Airtime',
      electricity: 'Bills Payment | Electricity',
      mobile_data: 'Bills Payment | Mobile Data',
      tv_subscription: 'Bills Payment | TV Subscription',
      exam_cards: 'Bills Payment | Exam Cards',
    };

    // Build nature label dynamically per service type
    const natureMap = {
      airtime: 'Airtime Purchase',
      electricity: 'Electricity Purchase',
      mobile_data: 'Data Purchase',
      tv_subscription: 'TV Subscription',
      exam_cards: 'Exam Card Purchase',
    };

    await FundTransfer.create({
      acct_name: user_name,
      acct_number: tag_id,
      sender_name: provider,
      amount: Number(amount),
      tran_service_type: 'Bills Payment',
      tran_type: 'Debit',
      transac_nature: natureMap[service_type] || service_title,
      transac_category: categoryMap[service_type] || 'Bills Payment',
      tran_desc: service_title,
      trans_method: 'Wallet',
      trans_balance: Number(wallet_balance_after),
      colorcode: '#4C5FD5',
      createdBy: userId,
      transaction_status: 'Completed',
      tid: reference,
      tr_year: now.getFullYear().toString(),
      tr_month: (now.getMonth() + 1).toString(),
      tr_day: now.getDate().toString(),
      creditOn: now,
      createdOn: now.getTime().toString(),
      approved_date: now,
      addeby: userId,
    });
    return { ok: true };
  } catch (error) {
    console.log('Save transfer history error:', error.message);
    return { ok: false };
  }
};

// -- Process coins reward after bill payment -------
const processBillRewards = async ({
  userId,
  tag_id,
  amount,
  reference,
  service_title,
}) => {
  try {
    const result = await creditCoins({
      userId,
      tag_id,
      amount,
      source_type: 'bills_payment',
      source_reference: reference,
      description: `Coins earned from ${service_title} purchase`,
    });

    // Update coins_earned on the transaction
    if (result.coins > 0) {
      await BillsTransaction.findOneAndUpdate(
        { reference },
        { coins_earned: result.coins }
      );
    }

    return result;
  } catch (error) {
    console.log('Process rewards error:', error.message);
    return { coins: 0 };
  }
};

// -- Full finalize after provider success ----------
// Saves transaction + credits coins + sends email
const finalizeBillTransaction = async ({
  userId,
  tag_id,
  user,
  service_type,
  service_title,
  provider,
  amount,
  wallet_balance_before,
  wallet_balance_after,
  reference,
  provider_reference = '',
  provider_response = {},
  // service specific — all optional with defaults
  phone_number = '',
  meter_number = '',
  disco_code = '',
  meter_type = '',
  smartcard_number = '',
  customer_name = '',
  bouquet = '',
  network = '',
  data_plan = '',
  exam_type = '',
  quantity = 1,
  delivery_phone = '',
  delivery_email = '',
  pins_delivered = [],
  token_delivered = '',
}) => {
  // 1. Save bills transaction record
  let transaction = null;
  try {
    const result = await saveBillsTransaction({
      userId,
      tag_id,
      service_type,
      service_title,
      provider,
      amount,
      wallet_balance_before,
      wallet_balance_after,
      reference,
      provider_reference,
      provider_response,
      phone_number,
      meter_number,
      disco_code,
      meter_type,
      smartcard_number,
      customer_name,
      bouquet,
      network,
      data_plan,
      exam_type,
      quantity,
      delivery_phone,
      delivery_email,
      pins_delivered,
      token_delivered,
    });
    transaction = result.transaction;
  } catch (txError) {
    console.log('Save bills transaction error:', txError.message);
  }

  // 2. Save to fund_transfer for history visibility
  try {
    await saveToTransferHistory({
      userId,
      tag_id,
      user_name: user?.display_name || tag_id,
      service_title,
      service_type,
      provider,
      amount,
      reference,
      wallet_balance_after,
    });
  } catch (historyError) {
    console.log('Save transfer history error:', historyError.message);
  }

  // 3. Credit coins
  let coinsResult = { coins: 0 };
  try {
    coinsResult = await processBillRewards({
      userId,
      tag_id,
      amount,
      reference,
      service_title,
    });
  } catch (coinsError) {
    console.log('Process rewards error:', coinsError.message);
  }

  // 4. Process one-time referral bonus — non-blocking
    // 4. Process signup bonus activation — non-blocking
  try {
    await processSignupBonus({
      userId,
      serviceType: service_type,
      amount,
      reference,
    });
  } catch (signupBonusError) {
    console.log('Signup bonus error:', signupBonusError.message);
  }

  // 4. Process signup bonus activation — non-blocking
  try {
    await processSignupBonus({
      userId,
      serviceType: service_type,
      amount,
      reference,
    })
  } catch (signupError) {
    console.log('Signup bonus error:', signupError.message)
  }

  // 5. Process one-time referral bonus — non-blocking
  // Uses new bonusService with all safety checks
  try {
    await processReferralBonusNew({
      buyerUserId: userId,
      buyerTagId: tag_id,
      serviceType: service_type,
      amount,
      reference,
    })
  } catch (referralError) {
    console.log('Referral bonus error:', referralError.message)
  }

  // 6. Process promoter commission — non-blocking
  try {
    await processPromoterBonus({
      buyerUserId: userId,
      buyerTagId: tag_id,
      purchaseAmount: amount,
      serviceTitle: service_title,
      reference,
    })
  } catch (promoterError) {
    console.log('Promoter bonus error:', promoterError.message)
  }

  // 7. Send email notification — non-blocking
  try {
    if (user?.email) {
      await sendBillPaymentEmail({
        email: user.email,
        name: user.display_name || 'User',
        service_title,
        amount,
        reference,
        balance: wallet_balance_after,
        coins_earned: coinsResult.coins || 0,
      });
    }
  } catch (emailError) {
    console.log('Bill email error:', emailError.message);
  }

  return {
    transaction,
    coins_earned: coinsResult.coins || 0,
  };
};

// -- Export all helpers ----------------------------
module.exports = {
  response,
  checkServiceStatus,
  checkWalletBalance,
  deductWallet,
  refundWallet,
  saveBillsTransaction,
  processBillRewards,
  finalizeBillTransaction,
  sendBillPaymentEmail,
  generateReference,
};