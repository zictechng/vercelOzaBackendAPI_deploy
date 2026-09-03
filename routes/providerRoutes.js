
// ------------------------------------------------
// providerRoutes.js
// Admin endpoints for managing bill providers.
// All routes require admin authentication.
// ------------------------------------------------

const express = require('express');
const router = express.Router();
const { isAuth } = require('../middleware/auth');
const { encrypt } = require('../utils/encryptor');
const { encodeId, decodeId, encodeDoc, encodeDocs } = require('../utils/idEncoder');
const {
  syncProviderServices,
  initServiceConfigs,
  clearCache,
} = require('../services/providerService');

const BillsProvider = require('../models/BillsProvider');
const BillsServiceConfig = require('../models/BillsServiceConfig');
const BillsProviderNetwork = require('../models/BillsProviderNetwork');

// ------------------------------------------------
// POST /api/provider/add
// Admin adds a new provider
// ------------------------------------------------
router.post('/provider/add', isAuth, async (req, res) => {
  try {
    const {
      name, slug, api_key, base_url,
      adapter_name, supported_services, notes,
    } = req.body;

    if (!name || !slug || !api_key || !base_url || !adapter_name) {
      return res.json({ msg: '400', message: 'Missing required fields.' });
    }

    // Check slug is unique
    const existing = await BillsProvider.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.json({ msg: '400', message: 'Provider with this slug already exists.' });
    }

    // Encrypt API key before saving
    const provider = await BillsProvider.create({
      name,
      slug: slug.toLowerCase(),
      api_key_encrypted: encrypt(api_key),
      base_url,
      adapter_name: adapter_name.toLowerCase(),
      supported_services: supported_services || {},
      notes: notes || '',
      status: 'inactive',
    });

    return res.json({
      msg: '200',
      message: 'Provider added successfully.',
      provider: encodeDoc(provider),
    });
  } catch (error) {
    console.log('Add provider error:', error.message);
    return res.json({ msg: '400', message: 'Could not add provider.' });
  }
});

// ------------------------------------------------
// GET /api/provider/list
// Get all providers
// ------------------------------------------------
router.get('/provider/list', isAuth, async (req, res) => {
  try {
    const providers = await BillsProvider.find()
      .select('-api_key_encrypted')
      .sort({ createdAt: -1 });

    return res.json({
      msg: '200',
      providers: encodeDocs(providers),
    });
  } catch (error) {
    console.log('List providers error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch providers.' });
  }
});

// ------------------------------------------------
// POST /api/provider/activate
// Admin activates a provider
// Also triggers service sync from provider API
// ------------------------------------------------
router.post('/provider/activate', isAuth, async (req, res) => {
  try {
    const { provider_id } = req.body;
    if (!provider_id) {
      return res.json({ msg: '400', message: 'Provider ID required.' });
    }

    const realId = decodeId(provider_id);
    const provider = await BillsProvider.findByIdAndUpdate(
      realId,
      { status: 'active' },
      { new: true }
    );

    if (!provider) {
      return res.json({ msg: '404', message: 'Provider not found.' });
    }

    // Sync services from provider API
    const syncResult = await syncProviderServices(realId);
    clearCache();

    return res.json({
      msg: '200',
      message: `Provider activated. ${syncResult.synced || 0} services synced.`,
      provider: encodeDoc(provider),
      sync: syncResult,
    });
  } catch (error) {
    console.log('Activate provider error:', error.message);
    return res.json({ msg: '400', message: 'Could not activate provider.' });
  }
});

// ------------------------------------------------
// POST /api/provider/deactivate
// Admin deactivates a provider
// ------------------------------------------------
router.post('/provider/deactivate', isAuth, async (req, res) => {
  try {
    const { provider_id } = req.body;
    const realId = decodeId(provider_id);

    const provider = await BillsProvider.findByIdAndUpdate(
      realId,
      { status: 'inactive' },
      { new: true }
    );

    if (!provider) {
      return res.json({ msg: '404', message: 'Provider not found.' });
    }

    clearCache();

    return res.json({
      msg: '200',
      message: 'Provider deactivated.',
      provider: encodeDoc(provider),
    });
  } catch (error) {
    console.log('Deactivate provider error:', error.message);
    return res.json({ msg: '400', message: 'Could not deactivate provider.' });
  }
});

// ------------------------------------------------
// POST /api/provider/set-service
// Admin sets which provider handles a service type
// ------------------------------------------------
router.post('/provider/set-service', isAuth, async (req, res) => {
  try {
    const { service_type, provider_id } = req.body;

    if (!service_type) {
      return res.json({ msg: '400', message: 'Service type required.' });
    }

    const validTypes = ['airtime', 'data', 'electricity', 'tv_subscription', 'exam_cards'];
    if (!validTypes.includes(service_type)) {
      return res.json({ msg: '400', message: 'Invalid service type.' });
    }

    const updateData = {};
    if (provider_id) {
      updateData.active_provider_id = decodeId(provider_id);
    } else {
      updateData.active_provider_id = null;
    }

    const config = await BillsServiceConfig.findOneAndUpdate(
      { service_type },
      updateData,
      { upsert: true, new: true }
    ).populate('active_provider_id', '-api_key_encrypted');

    clearCache();

    return res.json({
      msg: '200',
      message: `${service_type} provider updated.`,
      config,
    });
  } catch (error) {
    console.log('Set service provider error:', error.message);
    return res.json({ msg: '400', message: 'Could not update service provider.' });
  }
});

// ------------------------------------------------
// POST /api/provider/set-service-status
// Admin sets service status active/paused/hidden
// ------------------------------------------------
router.post('/provider/set-service-status', isAuth, async (req, res) => {
  try {
    const { service_type, status } = req.body;

    if (!service_type || !status) {
      return res.json({ msg: '400', message: 'Service type and status required.' });
    }

    const validStatus = ['active', 'paused', 'hidden'];
    if (!validStatus.includes(status)) {
      return res.json({ msg: '400', message: 'Invalid status.' });
    }

    const config = await BillsServiceConfig.findOneAndUpdate(
      { service_type },
      { status },
      { upsert: true, new: true }
    );

    clearCache();

    return res.json({
      msg: '200',
      message: `${service_type} status set to ${status}.`,
      config,
    });
  } catch (error) {
    console.log('Set service status error:', error.message);
    return res.json({ msg: '400', message: 'Could not update service status.' });
  }
});

// ------------------------------------------------
// POST /api/provider/sync/:provider_id
// Admin manually syncs services from provider API
// ------------------------------------------------
router.post('/provider/sync/:provider_id', isAuth, async (req, res) => {
  try {
    const realId = decodeId(req.params.provider_id);
    const result = await syncProviderServices(realId);
    clearCache();

    return res.json({
      msg: result.success ? '200' : '400',
      message: result.success
        ? `Sync complete. ${result.synced} services updated.`
        : result.message,
    });
  } catch (error) {
    console.log('Sync provider error:', error.message);
    return res.json({ msg: '400', message: 'Could not sync provider.' });
  }
});

// ------------------------------------------------
// GET /api/provider/networks/:service_type
// Get all networks for a service type
// ------------------------------------------------
router.get('/provider/networks/:service_type', isAuth, async (req, res) => {
  try {
    const { service_type } = req.params;
    const networks = await BillsProviderNetwork.find({
      service_type,
      status: 'active',
    }).sort({ sort_order: 1, network_name: 1 });

    return res.json({
      msg: '200',
      networks: encodeDocs(networks),
    });
  } catch (error) {
    console.log('Get networks error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch networks.' });
  }
});

// ------------------------------------------------
// GET /api/provider/service-configs
// Get all service configurations
// ------------------------------------------------
router.get('/provider/service-configs', isAuth, async (req, res) => {
  try {
    const configs = await BillsServiceConfig.find()
      .populate('active_provider_id', '-api_key_encrypted')
      .populate('fallback_provider_id', '-api_key_encrypted');

    return res.json({
      msg: '200',
      configs,
    });
  } catch (error) {
    console.log('Get service configs error:', error.message);
    return res.json({ msg: '400', message: 'Could not fetch service configs.' });
  }
});

// ------------------------------------------------
// POST /api/provider/init
// Initialize default service configs
// Call once after deployment
// ------------------------------------------------
router.post('/provider/init', isAuth, async (req, res) => {
  try {
    await initServiceConfigs();
    return res.json({
      msg: '200',
      message: 'Service configs initialized.',
    });
  } catch (error) {
    console.log('Init configs error:', error.message);
    return res.json({ msg: '400', message: 'Could not initialize configs.' });
  }
});

module.exports = router;
