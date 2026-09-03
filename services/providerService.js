// ------------------------------------------------
// providerService.js
// Resolves the correct provider adapter for
// each service type. Handles fallback to VTUGate.
// All bill routes use this — never call adapters
// directly from routes.
// ------------------------------------------------

const BillsProvider = require('../models/BillsProvider');
const BillsServiceConfig = require('../models/BillsServiceConfig');
const BillsProviderNetwork = require('../models/BillsProviderNetwork');
const { decrypt } = require('../utils/encryptor');

// Adapter registry — add new adapters here only
const ADAPTER_REGISTRY = {
  vtugate: () => require('./adapters/vtuGateAdapter'),
  bigisub: () => require('./adapters/bigisubAdapter'),
  monnify: () => require('./adapters/monnifyAdapter'),
};

// In-memory cache — clears every 5 minutes
let providerCache = {};
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000;

const clearCache = () => {
  providerCache = {};
  cacheTime = null;
};

// ------------------------------------------------
// Load provider from DB and build adapter
// ------------------------------------------------
const loadAdapter = async (provider) => {
  if (!provider) return null;
  const AdapterClass = ADAPTER_REGISTRY[provider.adapter_name]?.();
  if (!AdapterClass) {
    console.log(`No adapter found for: ${provider.adapter_name}`);
    return null;
  }
  // Decrypt API key at runtime — never stored plain
  const providerWithKey = {
    ...provider.toObject(),
    api_key_decrypted: decrypt(provider.api_key_encrypted),
  };
  return new AdapterClass(providerWithKey);
};

// ------------------------------------------------
// Get VTUGate fallback adapter
// Always available — system default
// ------------------------------------------------
const getFallbackAdapter = async () => {
  try {
    const vtugate = await BillsProvider.findOne({
      slug: 'vtugate',
      status: 'active',
    });
    if (!vtugate) {
      // Last resort — use env variables directly
      const fallbackProvider = {
        slug: 'vtugate',
        adapter_name: 'vtugate',
        api_key_decrypted: process.env.VTUGATE_API_KEY,
        base_url: process.env.VTUGATE_BASE_URL || 'https://api.vtugate.com',
      };
      const VTUGateAdapter = require('./adapters/vtuGateAdapter');
      return new VTUGateAdapter(fallbackProvider);
    }
    return await loadAdapter(vtugate);
  } catch (error) {
    console.log('Get fallback adapter error:', error.message);
    // Absolute last resort
    const VTUGateAdapter = require('./adapters/vtuGateAdapter');
    return new VTUGateAdapter({
      slug: 'vtugate',
      adapter_name: 'vtugate',
      api_key_decrypted: process.env.VTUGATE_API_KEY,
      base_url: process.env.VTUGATE_BASE_URL || 'https://api.vtugate.com',
    });
  }
};

// ------------------------------------------------
// Resolve adapter for a service type
// 1. Check BillsServiceConfig for active provider
// 2. Load that provider's adapter
// 3. Fall back to VTUGate if not set or inactive
// ------------------------------------------------
const resolveAdapter = async (service_type) => {
  try {
    const config = await BillsServiceConfig.findOne({ service_type })
      .populate('active_provider_id');

    if (
      config?.active_provider_id &&
      config.active_provider_id.status === 'active'
    ) {
      const adapter = await loadAdapter(config.active_provider_id);
      if (adapter) return { adapter, provider: config.active_provider_id };
    }

    // Fallback
    const fallback = await getFallbackAdapter();
    const fallbackProvider = await BillsProvider.findOne({ slug: 'vtugate' });
    return { adapter: fallback, provider: fallbackProvider };
  } catch (error) {
    console.log('Resolve adapter error:', error.message);
    const fallback = await getFallbackAdapter();
    return { adapter: fallback, provider: null };
  }
};

// ------------------------------------------------
// Get service network/disco config from DB
// Returns service_id for a specific network
// e.g. getNetwork('airtime', 'mtn') → { service_id: '58' }
// ------------------------------------------------
const getNetwork = async (service_type, network_name, provider_id = null) => {
  try {
    const query = {
      service_type,
      network_name: network_name.toLowerCase(),
      status: 'active',
    };
    if (provider_id) query.provider_id = provider_id;

    const network = await BillsProviderNetwork.findOne(query);
    return network || null;
  } catch (error) {
    console.log('Get network error:', error.message);
    return null;
  }
};

// ------------------------------------------------
// Get all active networks for a service type
// Used by dynamic config endpoints
// ------------------------------------------------
const getNetworks = async (service_type, provider_id = null) => {
  try {
    const query = { service_type, status: 'active' };
    if (provider_id) query.provider_id = provider_id;

    const networks = await BillsProviderNetwork.find(query)
      .sort({ sort_order: 1, network_name: 1 });
    return networks;
  } catch (error) {
    console.log('Get networks error:', error.message);
    return [];
  }
};

// ------------------------------------------------
// Sync provider services from provider API
// Called when admin activates a provider
// Fetches all service IDs and stores in DB
// ------------------------------------------------
const syncProviderServices = async (provider_id) => {
  try {
    const provider = await BillsProvider.findById(provider_id);
    if (!provider) return { success: false, message: 'Provider not found' };

    const adapter = await loadAdapter(provider);
    if (!adapter) return { success: false, message: 'Adapter not found' };

    // Fetch all services from provider
    const result = await adapter.fetchAllServices();
    if (!result.success) return { success: false, message: result.message };

    const services = result.services || [];
    let synced = 0;

    for (const service of services) {
      // Map provider response to our schema
      const networkData = mapServiceToNetwork(service, provider);
      if (!networkData) continue;

      // Upsert — update if exists, create if not
      try {
        await BillsProviderNetwork.findOneAndUpdate(
          {
            provider_id: provider._id,
            service_type: networkData.service_type,
            network_name: networkData.network_name,
          },
          {
            ...networkData,
            provider_id: provider._id,
            provider_slug: provider.slug,
          },
          { upsert: true, new: true }
        );
        synced++;
      } catch (upsertError) {
        console.log('Upsert error:', upsertError.message, networkData.network_name);
      }
    }

    return { success: true, synced };
  } catch (error) {
    console.log('Sync provider services error:', error.message);
    return { success: false, message: error.message };
  }
};

// ------------------------------------------------
// Map raw provider service response to our schema
// Add mapping for new providers here
// ------------------------------------------------
const mapServiceToNetwork = (service, provider) => {
  if (provider.adapter_name === 'vtugate') {
    const fetchedType = service._fetched_type;

    // Airtime
    if (fetchedType === 'airtime') {
      return {
        service_type: 'airtime',
        network_name: (service.network_name || '').toLowerCase(),
        display_name: capitalize(service.network_name || ''),
        service_id: String(service.service_id),
        commission_type: service.commission_type || '',
        commission_value: service.commission_value || 0,
        extra_params: {},
      };
    }

    // Data
    // Data — include data_type in network_name to avoid duplicates
    if (fetchedType === 'data') {
      const dataType = service.data_type || 'default';
      return {
        service_type: 'data',
        network_name: `${(service.network_name || '').toLowerCase()}_${dataType.toLowerCase()}`,
        display_name: `${capitalize(service.network_name || '')} (${dataType.toUpperCase()})`,
        service_id: String(service.service_id),
        commission_type: service.commission_type || '',
        commission_value: service.commission_value || 0,
        extra_params: {
          data_type: service.data_type || '',
          network: (service.network_name || '').toLowerCase(),
        },
      };
    }

    // Electricity
    if (fetchedType === 'electricity') {
      return {
        service_type: 'electricity',
        network_name: (service.disco || '').toLowerCase(),
        display_name: (service.disco || '').toUpperCase(),
        service_id: String(service.service_id),
        commission_type: service.commission_type || '',
        commission_value: service.commission_value || 0,
        extra_params: { disco: service.disco },
      };
    }

    // TV
    if (fetchedType === 'tv') {
      return {
        service_type: 'tv_subscription',
        network_name: (service.tv_name || '').toLowerCase(),
        display_name: service.tv_name || '',
        service_id: String(service.service_id),
        commission_type: service.commission_type || '',
        commission_value: service.commission_value || 0,
        extra_params: {},
      };
    }

    // Exam cards
    if (fetchedType === 'education') {
      return {
        service_type: 'exam_cards',
        network_name: (service.service_name || '').toLowerCase(),
        display_name: service.edu_type || service.service_name || '',
        service_id: String(service.service_id),
        commission_type: service.commission_type || '',
        commission_value: service.commission_value || 0,
        extra_params: {
          product_code: service.product_code || '',
          edu_type: service.edu_type || '',
        },
      };
    }
  }
  return null;
};

// ------------------------------------------------
// Initialize default service configs
// Called once on first server start
// Creates BillsServiceConfig for each service type
// with VTUGate as default provider
// ------------------------------------------------
const initServiceConfigs = async () => {
  try {
    const serviceTypes = [
      'airtime',
      'data',
      'electricity',
      'tv_subscription',
      'exam_cards',
    ];

    const vtugate = await BillsProvider.findOne({ slug: 'vtugate' });

    for (const service_type of serviceTypes) {
      const existing = await BillsServiceConfig.findOne({ service_type });
      if (!existing) {
        await BillsServiceConfig.create({
          service_type,
          active_provider_id: vtugate?._id || null,
          fallback_provider_id: vtugate?._id || null,
          status: 'active',
        });
        console.log(`Created service config for: ${service_type}`);
      }
    }
  } catch (error) {
    console.log('Init service configs error:', error.message);
  }
};

// ------------------------------------------------
// Check service status using new dynamic config
// Replaces old BillsServiceStatus model
// ------------------------------------------------
const checkServiceStatus = async (service_type) => {
  try {
    const config = await BillsServiceConfig.findOne({ service_type });
    if (!config) return { ok: true }; // fail open

    if (config.status === 'hidden' || config.status === 'paused') {
      return {
        ok: false,
        response: {
          msg: '503',
          status: '503',
          message: config.status === 'paused'
            ? `${service_type} service is under maintenance. Please try again later.`
            : `${service_type} service is currently unavailable.`,
        },
      };
    }
    return { ok: true };
  } catch (error) {
    console.log('Check service status error:', error.message);
    return { ok: true }; // fail open
  }
};

// Helper
const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

module.exports = {
  resolveAdapter,
  getNetwork,
  getNetworks,
  syncProviderServices,
  initServiceConfigs,
  checkServiceStatus,
  getFallbackAdapter,
  clearCache,
};
