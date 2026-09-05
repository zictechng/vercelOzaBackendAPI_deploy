
// -------------------------------------------------
// Rewards Routes
// Handles coins balance, history and settings.
// -------------------------------------------------

const express = require('express');
const router = express.Router();
const { isAuth } = require('../middleware/auth');

const RewardsSettings = require('../models/RewardsSettings');
const CoinsTransaction = require('../models/CoinsTransaction');
const User = require('../models/User');

// -------------------------------------------------
// GET /api/rewards_settings
// Get rewards configuration — rates, coin values.
// Public — used in bill screens to show coin tips.
// -------------------------------------------------
router.get('/rewards_settings', async (req, res) => {
  try {
    let settings = await RewardsSettings.findOne();
    if (!settings) {
      settings = await RewardsSettings.create({});
    }
    return res.json({
      msg: '200',
      status: '200',
      settings: {
        digital_services_coin_rate: settings.digital_services_coin_rate,
        buy_sell_coin_rate: settings.buy_sell_coin_rate,
        general_referral_rate: settings.general_referral_rate,
        business_promoter_rate: settings.business_promoter_rate,
        coin_ngn_value: settings.coin_ngn_value,
        coin_usd_value: settings.coin_usd_value,
        min_redeem_coins: settings.min_redeem_coins,
        rewards_active: settings.rewards_active,
      },
    });
  } catch (error) {
    console.log('Rewards settings error:', error.message);
    return res.json({ msg: '400', status: '400', message: 'Could not fetch rewards settings.' });
  }
});

// -------------------------------------------------
// GET /api/user_coins/:userId
// Get user coins balance and tier info.
// -------------------------------------------------
router.get('/user_coins/:userId', isAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('coins display_name tag_id').lean();
    if (!user) {
      return res.json({ msg: '404', status: '404', message: 'User not found.' });
    }

    const settings = await RewardsSettings.findOne().lean();
    const coinNgnValue = settings?.coin_ngn_value || 1;
    const coinUsdValue = settings?.coin_usd_value || 0.001;
    const coins = user.coins || 0;

    return res.json({
      msg: '200',
      status: '200',
      coins,
      ngn_value: (coins * coinNgnValue).toFixed(2),
      usd_value: (coins * coinUsdValue).toFixed(4),
      coin_ngn_value: coinNgnValue,
      coin_usd_value: coinUsdValue,
    });
  } catch (error) {
    console.log('User coins error:', error.message);
    return res.json({ msg: '400', status: '400', message: 'Could not fetch coins balance.' });
  }
});

// -------------------------------------------------
// GET /api/user_coins_history/:userId
// Get full coins transaction history for a user.
// -------------------------------------------------
router.get('/user_coins_history/:userId', isAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CoinsTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoinsTransaction.countDocuments({ userId }),
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
    console.log('Coins history error:', error.message);
    return res.json({ msg: '400', status: '400', message: 'Could not fetch coins history.' });
  }
});

// GET /api/admin/coins/history
// Admin view of all coins transactions with filters and stats
router.get('/admin/coins/history', isAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const { source_type, search } = req.query;

    const query = {};
    if (source_type) query.source_type = source_type;
    if (search) query.tag_id = { $regex: search, $options: 'i' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [transactions, total, totalCoinsData, todayCoinsData] = await Promise.all([
      CoinsTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoinsTransaction.countDocuments(query),
      CoinsTransaction.aggregate([
        { $match: { type: 'credit' } },
        { $group: { _id: null, total: { $sum: '$coins' } } },
      ]),
      CoinsTransaction.aggregate([
        { $match: { type: 'credit', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$coins' } } },
      ]),
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
      stats: {
        totalCoins: totalCoinsData[0]?.total || 0,
        todayCoins: todayCoinsData[0]?.total || 0,
      },
    });
  } catch (error) {
    console.log('Admin coins history error:', error.message);
    return res.json({ msg: '400', status: '400', message: 'Could not fetch coins history.' });
  }
});

// POST /api/rewards_settings/update
// Admin updates rewards settings
router.post('/rewards_settings/update', isAuth, async (req, res) => {
  try {
    let settings = await RewardsSettings.findOne();
    if (!settings) {
      settings = await RewardsSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    return res.json({ msg: '200', status: '200', message: 'Rewards settings updated successfully.' });
  } catch (error) {
    console.log('Update rewards settings error:', error.message);
    return res.json({ msg: '400', status: '400', message: 'Could not update rewards settings.' });
  }
});



module.exports = router;