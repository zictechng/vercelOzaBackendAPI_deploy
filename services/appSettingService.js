
// -------------------------------------------------
// App Setting Service
// Fetches app settings from DB dynamically.
// Used across all services — app name, logo etc
// are never hardcoded anywhere in the codebase.
// Cached for 5 minutes to avoid repeated DB calls.
// -------------------------------------------------

const AppSetting = require('../models/AppSettingDetails');

let cachedSettings = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// -- Get app settings (cached) ---------------------
const getAppSettings = async () => {
  try {
    const now = Date.now();
    // Return cache if still valid
    if (cachedSettings && cacheTime && (now - cacheTime) < CACHE_DURATION) {
      return cachedSettings;
    }
    // Fetch fresh from DB
    const settings = await AppSetting.findOne({ active: true });
    if (settings) {
      cachedSettings = settings;
      cacheTime = now;
    }
    return settings;
  } catch (error) {
    console.log('Get app settings error:', error.message);
    return cachedSettings || null;
  }
};

// -- Clear cache (call after admin updates settings) --
const clearSettingsCache = () => {
  cachedSettings = null;
  cacheTime = null;
};

// -- Get specific setting value safely ------------
const getSetting = async (key, defaultValue = '') => {
  const settings = await getAppSettings();
  return settings?.[key] ?? defaultValue;
};

module.exports = {
  getAppSettings,
  clearSettingsCache,
  getSetting,
};