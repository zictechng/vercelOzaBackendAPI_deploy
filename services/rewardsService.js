
// -------------------------------------------------
// Rewards Service
// Handles coins calculation and crediting
// after every successful bill payment or trade.
// Called internally — never directly by client.
// -------------------------------------------------

const User = require('../models/User');
const CoinsTransaction = require('../models/CoinsTransaction');
const RewardsSettings = require('../models/RewardsSettings');

// -- Get or create rewards settings ---------------
const getRewardsSettings = async () => {
  let settings = await RewardsSettings.findOne();
  if (!settings) {
    settings = await RewardsSettings.create({});
  }
  return settings;
};

// -- Credit coins to user --------------------------
const creditCoins = async ({
  userId,
  tag_id,
  amount,          // transaction amount in NGN
  source_type,     // bills_payment | buy_sell | referral | business_promoter
  source_reference, // bills transaction reference
  description,
}) => {
  try {
    const settings = await getRewardsSettings();
    if (!settings.rewards_active) return { success: true, coins: 0 };

    // Calculate coins based on source type
    let rate = 0;
    if (source_type === 'bills_payment') {
      rate = settings.digital_services_coin_rate;
    } else if (source_type === 'buy_sell') {
      rate = settings.buy_sell_coin_rate;
    } else if (source_type === 'referral') {
      rate = settings.general_referral_rate;
    } else if (source_type === 'business_promoter') {
      rate = settings.business_promoter_rate;
    }

    // Coins = (amount * rate) / 100
    const coinsEarned = Math.floor((Number(amount) * rate) / 100);
    if (coinsEarned <= 0) return { success: true, coins: 0 };

    // Get user current coins
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found' };

    const coinsBefore = user.coins || 0;
    const coinsAfter = coinsBefore + coinsEarned;

    // Update user coins
    await User.findByIdAndUpdate(userId, { coins: coinsAfter });

    // Record coins transaction
    await CoinsTransaction.create({
      userId,
      tag_id,
      coins: coinsEarned,
      type: 'credit',
      source_type,
      source_reference,
      description,
      coins_balance_before: coinsBefore,
      coins_balance_after: coinsAfter,
    });

    return {
      success: true,
      coins: coinsEarned,
      coins_balance: coinsAfter,
    };
  } catch (error) {
    console.log('Credit coins error:', error.message);
    return { success: false, coins: 0, message: error.message };
  }
};

// -- Generate unique transaction reference ---------
const generateReference = (prefix = 'BILL') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = {
  getRewardsSettings,
  creditCoins,
  generateReference,
};