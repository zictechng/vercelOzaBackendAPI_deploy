
const mongoose = require('mongoose');

// -------------------------------------------------
// RewardsSettings
// Admin-configured reward rates.
// All percentages stored as numbers e.g. 2.5 = 2.5%
// Only ONE document exists — updated by admin.
// -------------------------------------------------

const rewardsSettingsSchema = new mongoose.Schema(
  {
    // Coins earned on digital services (bills)
    // as a % of transaction amount
    digital_services_coin_rate: {
      type: Number,
      default: 2,
    },
    // Coins earned on buy/sell transactions
    buy_sell_coin_rate: {
      type: Number,
      default: 1,
    },
    // Referral reward rates
    general_referral_rate: {
      type: Number,
      default: 1,
    },
    business_promoter_rate: {
      type: Number,
      default: 2,
    },
    // Coin monetary value
    coin_ngn_value: {
      type: Number,
      default: 1,
    },
    coin_usd_value: {
      type: Number,
      default: 0.001,
    },
    // Minimum coins to redeem
    min_redeem_coins: {
      type: Number,
      default: 100,
    },
    // Is rewards system active
    rewards_active: {
      type: Boolean,
      default: true,
    },
    last_updated_by: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RewardsSettings', rewardsSettingsSchema);