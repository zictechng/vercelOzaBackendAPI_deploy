// ------------------------------------------------
// referralService.js
// Handles automatic referral commission crediting
// after every successful purchase.
//
// TYPE 1 — One-time referral bonus:
//   Referrer earns bonus_rate% of purchase amount
//   ONE TIME ONLY — when ref_status is Pending
//   Toggle: AppSettingDetails.app_referral_bonus
//   Rate: businessRate.bonus_rate
//
// TYPE 2 — Business Promoter ongoing commission:
//   Promoter earns promoter_rate% of every purchase
//   by users they promoted — ongoing, not one-time
//   Toggle: AppSettingDetails.app_promoter_bonus
//   Rate: RewardsSettings.business_promoter_rate
// ------------------------------------------------

const User = require('../models/User');
const UserReferral = require('../models/referralUser');
const FundTransfer = require('../models/fundTransfer');
const AppSetting = require('../models/AppSettingDetails');
const BusinessRate = require('../models/businessRate');
const RewardsSettings = require('../models/RewardsSettings');
const Notification = require('../models/NotificationAlert');
const { getAppSettings } = require('./appSettingService');

// ------------------------------------------------
// TYPE 1 — Process one-time referral bonus
// Called after every successful purchase
// Credits referrer's all_bonus_acct once only
// ------------------------------------------------
const processReferralBonus = async ({
  buyerUserId,
  buyerTagId,
  purchaseAmount,
  serviceTitle,
  reference,
}) => {
  try {
    // Check if referral bonus is enabled
    const appSettings = await AppSetting.findOne();
    if (!appSettings?.app_referral_bonus) {
      return { success: true, skipped: true, reason: 'Referral bonus disabled' };
    }

    // Find pending referral record for this buyer
    const referral = await UserReferral.findOne({
      createdBy: buyerUserId,
      ref_status: 'Pending',
    });

    if (!referral) {
      return { success: true, skipped: true, reason: 'No pending referral found' };
    }

    // Get referrer user
    const referrer = await User.findOne({ tag_id: referral.ref_mainTag });
    if (!referrer) {
      return { success: true, skipped: true, reason: 'Referrer not found' };
    }

    // Get bonus rate from businessRate
    const businessRate = await BusinessRate.findOne();
    const bonusRate = Number(businessRate?.bonus_rate || 0);
    if (bonusRate <= 0) {
      return { success: true, skipped: true, reason: 'Bonus rate is zero' };
    }

    // Calculate commission
    const commission = (Number(purchaseAmount) * bonusRate) / 100;
    if (commission <= 0) {
      return { success: true, skipped: true, reason: 'Commission is zero' };
    }

    // Credit referrer's bonus wallet
    const newBonusBalance = Number(referrer.all_bonus_acct || 0) + commission;
    await User.findByIdAndUpdate(referrer._id, {
      all_bonus_acct: newBonusBalance,
    });

    // Mark referral as approved
    await UserReferral.findByIdAndUpdate(referral._id, {
      ref_status: 'Approved',
      ref_amt: commission,
      ref_approvedDate: new Date(),
    });

    // Save to fund_transfer history for referrer
    const now = new Date();
    await FundTransfer.create({
      acct_name: referrer.display_name,
      acct_number: referrer.tag_id,
      sender_name: 'Referral Commission',
      sender_acct_number: buyerTagId,
      amount: commission,
      tran_service_type: 'Referral',
      tran_type: 'Credit',
      transac_nature: 'Referral Bonus',
      transac_category: 'Referral Commission',
      tran_desc: `Referral commission from ${serviceTitle} purchase`,
      trans_method: 'Auto',
      trans_balance: newBonusBalance,
      colorcode: '#10B981',
      createdBy: referrer._id,
      transaction_status: 'Completed',
      tid: `REF-${reference}`,
      tr_year: now.getFullYear().toString(),
      tr_month: (now.getMonth() + 1).toString(),
      tr_day: now.getDate().toString(),
      creditOn: now,
      createdOn: now.getTime().toString(),
      approved_date: now,
      addeby: referrer._id,
    });

    // Send in-app notification to referrer
    if (referrer.receive_app_message) {
      await Notification.create({
        alert_username: referrer.email,
        alert_name: referrer.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date: now,
        alert_user_id: referrer._id,
        alert_nature: `Referral Bonus Credited\nYour referral bonus of ₦${commission.toLocaleString()} has been credited to your bonus wallet. Your friend made their first purchase!`,
        alert_status: 1,
        alert_read_date: '',
      });
    }

    console.log(`Referral bonus: ₦${commission} credited to ${referrer.display_name}`);
    return { success: true, commission, referrer: referrer.display_name };
  } catch (error) {
    console.log('processReferralBonus error:', error.message);
    return { success: false, message: error.message };
  }
};

// ------------------------------------------------
// TYPE 2 — Process business promoter commission
// Called after every successful purchase
// Credits promoter's all_bonus_acct on every purchase
// ------------------------------------------------
const processPromoterBonus = async ({
  buyerUserId,
  buyerTagId,
  purchaseAmount,
  serviceTitle,
  reference,
}) => {
  try {
    // Check if promoter bonus is enabled
    const appSettings = await AppSetting.findOne();
    if (!appSettings?.app_promoter_bonus) {
      return { success: true, skipped: true, reason: 'Promoter bonus disabled' };
    }

    // Get buyer and check if they have a promoter
    const buyer = await User.findById(buyerUserId);
    if (!buyer?.promoter_tag_id) {
      return { success: true, skipped: true, reason: 'Buyer has no promoter' };
    }

    // Get promoter user
    const promoter = await User.findOne({
      tag_id: buyer.promoter_tag_id,
      business_promoter: true,
    });
    if (!promoter) {
      return { success: true, skipped: true, reason: 'Promoter not found or inactive' };
    }

    // Get promoter rate from RewardsSettings
    const rewardsSettings = await RewardsSettings.findOne();
    const promoterRate = Number(rewardsSettings?.business_promoter_rate || 0);
    if (promoterRate <= 0) {
      return { success: true, skipped: true, reason: 'Promoter rate is zero' };
    }

    // Calculate commission
    const commission = (Number(purchaseAmount) * promoterRate) / 100;
    if (commission <= 0) {
      return { success: true, skipped: true, reason: 'Commission is zero' };
    }

    // Credit promoter's bonus wallet
    const newBonusBalance = Number(promoter.all_bonus_acct || 0) + commission;
    await User.findByIdAndUpdate(promoter._id, {
      all_bonus_acct: newBonusBalance,
    });

    // Save to fund_transfer history for promoter
    const now = new Date();
    await FundTransfer.create({
      acct_name: promoter.display_name,
      acct_number: promoter.tag_id,
      sender_name: 'Promoter Commission',
      sender_acct_number: buyerTagId,
      amount: commission,
      tran_service_type: 'Promoter',
      tran_type: 'Credit',
      transac_nature: 'Promoter Commission',
      transac_category: 'Promoter Commission',
      tran_desc: `Promoter commission from ${serviceTitle} purchase`,
      trans_method: 'Auto',
      trans_balance: newBonusBalance,
      colorcode: '#7C3AED',
      createdBy: promoter._id,
      transaction_status: 'Completed',
      tid: `PRO-${reference}`,
      tr_year: now.getFullYear().toString(),
      tr_month: (now.getMonth() + 1).toString(),
      tr_day: now.getDate().toString(),
      creditOn: now,
      createdOn: now.getTime().toString(),
      approved_date: now,
      addeby: promoter._id,
    });

    // Send in-app notification to promoter
    if (promoter.receive_app_message) {
      await Notification.create({
        alert_username: promoter.email,
        alert_name: promoter.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date: now,
        alert_user_id: promoter._id,
        alert_nature: `Promoter Commission Credited\nYou earned ₦${commission.toLocaleString()} commission from a purchase by one of your referred users.`,
        alert_status: 1,
        alert_read_date: '',
      });
    }

    console.log(`Promoter bonus: ₦${commission} credited to ${promoter.display_name}`);
    return { success: true, commission, promoter: promoter.display_name };
  } catch (error) {
    console.log('processPromoterBonus error:', error.message);
    return { success: false, message: error.message };
  }
};

// ------------------------------------------------
// Get user tier based on coins count
// ------------------------------------------------
const getUserTier = async (coins) => {
  try {
    const settings = await RewardsSettings.findOne();
    const c = Number(coins || 0);

    if (c >= Number(settings?.tier_diamond || 100000)) {
      return { tier: 'Diamond', color: '#00B4D8', bonus_rate: 20 };
    } else if (c >= Number(settings?.tier_platinum || 20000)) {
      return { tier: 'Platinum', color: '#9B59B6', bonus_rate: 15 };
    } else if (c >= Number(settings?.tier_gold || 5000)) {
      return { tier: 'Gold', color: '#F59E0B', bonus_rate: 10 };
    } else if (c >= Number(settings?.tier_silver || 1000)) {
      return { tier: 'Silver', color: '#94A3B8', bonus_rate: 5 };
    } else {
      return { tier: 'Bronze', color: '#92400E', bonus_rate: 0 };
    }
  } catch (error) {
    return { tier: 'Bronze', color: '#92400E', bonus_rate: 0 };
  }
};

module.exports = {
  processReferralBonus,
  processPromoterBonus,
  getUserTier,
};