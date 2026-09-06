
// ------------------------------------------------
// bonusService.js
// Handles ALL bonus and commission logic:
//
// 1. Signup Bonus — activate pending bonus after
//    user makes qualifying transaction
//
// 2. Referral Bonus — credit referrer fixed $ amount
//    converted to ₦ when referred user makes
//    qualifying transaction (ONE TIME ONLY)
//
// 3. Ongoing Commission — % of every transaction
//    credited to referrer automatically
//    (handled separately in referralService.js)
//
// 4. Promoter Commission — % of every transaction
//    credited to promoter automatically
//    (handled separately in referralService.js)
//
// SAFETY CHECKS ON EVERY BONUS:
// - Global toggle must be ON
// - User must NOT be paused/blocked
// - Transaction must qualify (service + amount)
// ------------------------------------------------

const User = require('../models/User')
const UserReferral = require('../models/referralUser')
const FundTransfer = require('../models/fundTransfer')
const AppSetting = require('../models/AppSettingDetails')
const Notification = require('../models/NotificationAlert')
const sendEmail = require('./emailService')
const { getAppSettings } = require('./appSettingService')

// All available service types for qualifying check
const ALL_SERVICE_TYPES = [
  'paypal', 'payoneer', 'bitcoin',
  'airtime', 'data', 'electricity',
  'tv_subscription', 'exam_cards',
]

// Map bill service types to bonus service type keys
const BILL_TO_BONUS_SERVICE_MAP = {
  airtime: 'airtime',
  data: 'data',
  electricity: 'electricity',
  tv_subscription: 'tv_subscription',
  exam_cards: 'exam_cards',
}

// ------------------------------------------------
// Check if user is eligible to receive any bonus
// Returns { eligible: true } or { eligible: false, reason }
// ------------------------------------------------
const checkUserBonusEligibility = async (userId) => {
  try {
    const user = await User.findById(userId).select(
      'user_bonus_paused user_bonus_pause_reason display_name email ' +
      'reg_stage1 reg_stage2 reg_stage3 reg_stage4 acct_approved_status'
    )
    if (!user) return { eligible: false, reason: 'User not found' }

    // Check 1 — individual bonus pause by admin
    if (user.user_bonus_paused) {
      return {
        eligible: false,
        reason: user.user_bonus_pause_reason || 'Bonus paused by admin',
      }
    }

    // Check 2 — full account verification required
    // ALL stages must be complete AND KYC approved
    const isFullyVerified = (
      user.reg_stage1 === 'Yes' &&
      user.reg_stage2 === 'Yes' &&
      user.reg_stage3 === 'Yes' &&
      user.reg_stage4 === 'Yes' &&
      user.acct_approved_status === 'Approved'
    )

    if (!isFullyVerified) {
      // Identify which stage is incomplete for logging
      let missingStep = ''
      if (user.reg_stage1 !== 'Yes') missingStep = 'account not activated'
      else if (user.reg_stage2 !== 'Yes') missingStep = 'profile not completed'
      else if (user.reg_stage3 !== 'Yes') missingStep = 'profile photo not uploaded'
      else if (user.reg_stage4 !== 'Yes') missingStep = 'KYC document not uploaded'
      else if (user.acct_approved_status !== 'Approved') missingStep = 'KYC not approved by admin'

      return {
        eligible: false,
        reason: `Account not fully verified — ${missingStep}`,
      }
    }

    return { eligible: true }
  } catch (error) {
    console.log('checkUserBonusEligibility error:', error.message)
    return { eligible: true } // fail open — never block transaction
  }
}
// ------------------------------------------------
// Check if a transaction qualifies for bonus
// serviceType: 'airtime' | 'paypal' | etc
// amount: transaction amount in ₦
// qualifyServices: array of qualifying service types
// minAmount: minimum ₦ amount required
// ------------------------------------------------
const checkTransactionQualifies = (serviceType, amount, qualifyServices, minAmount) => {
  const normalizedType = BILL_TO_BONUS_SERVICE_MAP[serviceType] || serviceType
  const serviceQualifies = qualifyServices.includes(normalizedType)
  const amountQualifies = Number(amount) >= Number(minAmount)
  return {
    qualifies: serviceQualifies && amountQualifies,
    serviceQualifies,
    amountQualifies,
    normalizedType,
  }
}

// ------------------------------------------------
// Save bonus credit to fund_transfer history
// ------------------------------------------------
const saveBonusToHistory = async ({
  userId,
  userName,
  tagId,
  amount,
  reference,
  description,
  category,
  nature,
  balance,
}) => {
  try {
    const now = new Date()
    await FundTransfer.create({
      acct_name: userName,
      acct_number: tagId,
      amount: Number(amount),
      tran_service_type: 'Bonus',
      tran_type: 'Credit',
      transac_nature: nature,
      transac_category: category,
      tran_desc: description,
      trans_method: 'Auto',
      trans_balance: Number(balance),
      colorcode: '#10B981',
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
    })
  } catch (error) {
    console.log('saveBonusToHistory error:', error.message)
  }
}

// ------------------------------------------------
// Send bonus notification email
// ------------------------------------------------
const sendBonusEmail = async ({ userEmail, userName, subject, message }) => {
  try {
    //console.log(`📧 Sending bonus email to: ${userEmail}`)
    const appSettings = await getAppSettings()
    const APP_NAME = appSettings?.app_name || appSettings?.app_short_name || 'Admin'
    const APP_LOGO = appSettings?.app_logo || ''

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4C5FD5; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          ${APP_LOGO ? `<img src="${APP_LOGO}" alt="${APP_NAME}" style="height: 48px; margin-bottom: 12px;" />` : ''}
          <h2 style="color: #fff; margin: 0;">${APP_NAME}</h2>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px;">
          <p>Hi <strong>${userName}</strong>,</p>
          ${message}
          <p style="color: #6b7280; font-size: 14px;">Thank you for using ${APP_NAME}.</p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
      </div>
    `

    const APP_BASE_URL = appSettings?.app_baseurl || ''
    const domain = APP_BASE_URL.replace(/https?:\/\//, '').split('/')[0]
    const SUPPORT_EMAIL = domain ? `noreply@${domain}` : 'noreply@ota.com'
    const result = await sendEmail({
      from: { name: `${APP_NAME} Support`, email: SUPPORT_EMAIL },
      to: [{ email: userEmail }],
      subject,
      html,
      text: message.replace(/<[^>]*>/g, ''),
    })
    return result
  } catch (error) {
    console.error('❌ sendBonusEmail error:', error.message)
    console.error('❌ sendBonusEmail stack:', error.stack)
    console.log('sendBonusEmail error:', error.message)
  }
}

// ------------------------------------------------
// BONUS 1: Process Signup Bonus Activation
// Called after every transaction
// Activates pending signup bonus if transaction qualifies
// ------------------------------------------------
const processSignupBonus = async ({
  userId,
  serviceType,
  amount,
  reference,
}) => {
  try {
    // Get app settings
    const settings = await AppSetting.findOne()

    // Check global toggle
    if (!settings?.app_signup_bonus) {
      return { success: true, skipped: true, reason: 'Signup bonus disabled globally' }
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) return { success: true, skipped: true, reason: 'User not found' }

    // Check if already activated
    if (user.signup_bonus_activated) {
      return { success: true, skipped: true, reason: 'Signup bonus already activated' }
    }

    // Check if user has pending bonus
    if (!user.pending_signup_bonus_usd || user.pending_signup_bonus_usd <= 0) {
      return { success: true, skipped: true, reason: 'No pending signup bonus' }
    }

    // Check individual user eligibility
    const eligibility = await checkUserBonusEligibility(userId)
    if (!eligibility.eligible) {
      return { success: true, skipped: true, reason: eligibility.reason }
    }

    // Check transaction qualifies
    const qualifyServices = settings.signup_bonus_qualify_services || ['paypal', 'payoneer', 'bitcoin']
    const minAmount = Number(settings.signup_bonus_min_txn_amount || 0)
    const txnCheck = checkTransactionQualifies(serviceType, amount, qualifyServices, minAmount)

    if (!txnCheck.qualifies) {
      return {
        success: true,
        skipped: true,
        reason: !txnCheck.serviceQualifies
          ? `Service type '${serviceType}' does not qualify for signup bonus`
          : `Transaction amount ₦${amount} is below minimum ₦${minAmount}`,
      }
    }

    // Calculate bonus in ₦
    const bonusUsd = Number(user.pending_signup_bonus_usd)
    const conversionRate = Number(settings.signup_bonus_conversion_rate || 0)
    if (conversionRate <= 0) {
      return { success: true, skipped: true, reason: 'Signup bonus conversion rate not configured' }
    }
    const bonusNaira = bonusUsd * conversionRate

    // Credit to all_bonus_acct
    const newBonusBalance = Number(user.all_bonus_acct || 0) + bonusNaira

    await User.findByIdAndUpdate(userId, {
      all_bonus_acct: newBonusBalance,
      signup_bonus_activated: true,
      pending_signup_bonus_usd: 0,
      signup_account: 0, // clear pending display
    })

    // Save to history
    await saveBonusToHistory({
      userId,
      userName: user.display_name,
      tagId: user.tag_id,
      amount: bonusNaira,
      reference: `SB-${reference}`,
      description: `Signup bonus activated — $${bonusUsd} × ₦${conversionRate}`,
      category: 'Signup Bonus',
      nature: 'Signup Bonus Credit',
      balance: newBonusBalance,
    })

    // Send notification
    if (user.receive_app_message) {
      await Notification.create({
        alert_username: user.email,
        alert_name: user.display_name,
        alert_date: new Date(),
        alert_user_id: user._id,
        alert_nature: `🎉 Signup Bonus Activated!\nYour signup bonus of ₦${bonusNaira.toLocaleString()} has been credited to your bonus wallet.`,
        alert_status: 1,
        alert_read_date: '',
      })
    }

    // Send email
    if (user.receive_email_notification) {
      sendBonusEmail({
        userEmail: user.email,
        userName: user.display_name,
        subject: '🎉 Your Signup Bonus Has Been Activated!',
        message: `
          <p>Great news! Your signup bonus has been activated and credited to your bonus wallet.</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;">
            <p style="margin:8px 0;"><strong>Bonus Amount:</strong> ₦${bonusNaira.toLocaleString()}</p>
            <p style="margin:8px 0;"><strong>Reference:</strong> SB-${reference}</p>
            <p style="margin:8px 0;"><strong>Wallet:</strong> Bonus Wallet</p>
          </div>
          <p>You can now use your bonus balance for transactions or withdraw it to your account.</p>
        `,
      }).catch(err => console.log('Signup bonus email error:', err.message))
    }

    console.log(`✅ Signup bonus activated: ₦${bonusNaira} for ${user.display_name}`)
    return { success: true, activated: true, amount: bonusNaira }
  } catch (error) {
    console.log('processSignupBonus error:', error.message)
    return { success: false, message: error.message }
  }
}

// ------------------------------------------------
// BONUS 2: Process One-Time Referral Bonus
// Called after every transaction
// Credits referrer fixed $ amount if transaction qualifies
// ONE TIME ONLY — never again after first activation
// ------------------------------------------------
const processReferralBonus = async ({
  buyerUserId,
  buyerTagId,
  serviceType,
  amount,
  reference,
}) => {
  try {
    // Get app settings
    const settings = await AppSetting.findOne()

    // Check global toggle
    if (!settings?.app_referral_bonus) {
      return { success: true, skipped: true, reason: 'Referral bonus disabled globally' }
    }

    // Check bonus amount configured
    const bonusUsd = Number(settings.referral_bonus_usd_amount || 0)
    const conversionRate = Number(settings.referral_bonus_conversion_rate || 0)
    if (bonusUsd <= 0 || conversionRate <= 0) {
      return { success: true, skipped: true, reason: 'Referral bonus amount or rate not configured' }
    }

    // Check buyer verification — buyer must be fully verified
    // before their transaction can trigger referral bonus
    const buyerEligibility = await checkUserBonusEligibility(buyerUserId)
    if (!buyerEligibility.eligible) {
      return {
        success: true,
        skipped: true,
        reason: `Buyer not eligible: ${buyerEligibility.reason}`,
      }
    }

    // Find pending referral for this buyer
    const referral = await UserReferral.findOne({
      createdBy: buyerUserId,
      ref_status: 'Pending',
    })
    if (!referral) {
      return { success: true, skipped: true, reason: 'No pending referral found' }
    }

    // Get referrer
    const referrer = await User.findOne({ tag_id: referral.ref_mainTag })
    if (!referrer) {
      return { success: true, skipped: true, reason: 'Referrer not found' }
    }

    // Check referrer individual eligibility
    const eligibility = await checkUserBonusEligibility(referrer._id)
    if (!eligibility.eligible) {
      return { success: true, skipped: true, reason: `Referrer bonus paused: ${eligibility.reason}` }
    }

    // Check transaction qualifies
    const qualifyServices = settings.referral_bonus_qualify_services || ['paypal', 'payoneer', 'bitcoin']
    const minAmount = Number(settings.referral_bonus_min_txn_amount || 0)
    const txnCheck = checkTransactionQualifies(serviceType, amount, qualifyServices, minAmount)

    if (!txnCheck.qualifies) {
      return {
        success: true,
        skipped: true,
        reason: !txnCheck.serviceQualifies
          ? `Service '${serviceType}' does not qualify for referral bonus`
          : `Amount ₦${amount} below minimum ₦${minAmount}`,
      }
    }

    // Calculate bonus in ₦
    const bonusNaira = bonusUsd * conversionRate

    // Credit referrer's bonus wallet
    const newBonusBalance = Number(referrer.all_bonus_acct || 0) + bonusNaira

    await User.findByIdAndUpdate(referrer._id, {
      all_bonus_acct: newBonusBalance,
    })

    // Mark referral as approved
    await UserReferral.findByIdAndUpdate(referral._id, {
      ref_status: 'Approved',
      ref_amt: bonusNaira,
      ref_approvedDate: new Date(),
    })

    // Save to history
    await saveBonusToHistory({
      userId: referrer._id,
      userName: referrer.display_name,
      tagId: referrer.tag_id,
      amount: bonusNaira,
      reference: `REF-${reference}`,
      description: `Referral bonus — $${bonusUsd} × ₦${conversionRate} (referred user made qualifying transaction)`,
      category: 'Referral Bonus',
      nature: 'Referral Bonus Credit',
      balance: newBonusBalance,
    })

    // Send in-app notification to referrer
    if (referrer.receive_app_message) {
      await Notification.create({
        alert_username: referrer.email,
        alert_name: referrer.display_name,
        alert_date: new Date(),
        alert_user_id: referrer._id,
        alert_nature: `🎉 Referral Bonus Credited!\nYou earned ₦${bonusNaira.toLocaleString()} referral bonus. Your referred friend just made their first qualifying transaction!`,
        alert_status: 1,
        alert_read_date: '',
      })
    }

    // Send email to referrer
    if (referrer.receive_email_notification) {
      sendBonusEmail({
        userEmail: referrer.email,
        userName: referrer.display_name,
        subject: '🎉 Your Referral Bonus Has Been Credited!',
        message: `
          <p>Congratulations! Your referral bonus has been credited to your bonus wallet.</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;">
            <p style="margin:8px 0;"><strong>Bonus Amount:</strong> ₦${bonusNaira.toLocaleString()}</p>
            <p style="margin:8px 0;"><strong>Referred User:</strong> ${referral.ref_userName}</p>
            <p style="margin:8px 0;"><strong>Reference:</strong> REF-${reference}</p>
            <p style="margin:8px 0;"><strong>Wallet:</strong> Bonus Wallet</p>
          </div>
          <p>Thank you for referring friends to our platform!</p>
        `,
      }).catch(err => console.log('Referral bonus email error:', err.message))
    }

    console.log(`✅ Referral bonus: ₦${bonusNaira} credited to ${referrer.display_name}`)
    return { success: true, credited: true, amount: bonusNaira, referrer: referrer.display_name }
  } catch (error) {
    console.log('processReferralBonus error:', error.message)
    return { success: false, message: error.message }
  }
}

// ------------------------------------------------
// Admin: Pause/Unpause individual user bonus
// Called from admin portal user detail page
// Sends email notification to user
// ------------------------------------------------
const pauseUserBonus = async ({ userId, reason, adminName }) => {
  try {
    const user = await User.findById(userId)
    if (!user) return { success: false, message: 'User not found' }

    await User.findByIdAndUpdate(userId, {
      user_bonus_paused: true,
      user_bonus_pause_reason: reason || 'Paused by admin',
      user_bonus_paused_at: new Date(),
    })

    // Send email to user
    if (user.receive_email_notification) {
      sendBonusEmail({
        userEmail: user.email,
        userName: user.display_name,
        subject: 'Important: Your Bonus Earnings Have Been Paused',
        message: `
          <p>We are writing to inform you that your bonus and commission earnings have been temporarily paused.</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;border-left:4px solid #EF4444;">
            <p style="margin:8px 0;"><strong>Reason:</strong> ${reason || 'Under review'}</p>
            <p style="margin:8px 0;"><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>During this period, you will not receive any referral, signup or commission bonuses.</p>
          <p>If you believe this is an error, please contact our support team immediately via your account dashboard.</p>
        `,
      }).catch(err => console.log('Pause bonus email error:', err.message))
    }

    // In-app notification
    if (user.receive_app_message) {
      await Notification.create({
        alert_username: user.email,
        alert_name: user.display_name,
        alert_date: new Date(),
        alert_user_id: user._id,
        alert_nature: `⚠️ Bonus Paused\nYour bonus earnings have been temporarily paused. Reason: ${reason || 'Under review'}. Contact support for assistance.`,
        alert_status: 1,
        alert_read_date: '',
      })
    }

    return { success: true, message: 'User bonus paused successfully' }
  } catch (error) {
    console.log('pauseUserBonus error:', error.message)
    return { success: false, message: error.message }
  }
}

// ------------------------------------------------
// Admin: Unpause individual user bonus
// ------------------------------------------------
const unpauseUserBonus = async ({ userId, adminName }) => {
  try {
    const user = await User.findById(userId)
    if (!user) return { success: false, message: 'User not found' }

    await User.findByIdAndUpdate(userId, {
      user_bonus_paused: false,
      user_bonus_pause_reason: '',
      user_bonus_paused_at: null,
    })

    // Send email to user
    if (user.receive_email_notification) {
      sendBonusEmail({
        userEmail: user.email,
        userName: user.display_name,
        subject: '✅ Your Bonus Earnings Have Been Restored',
        message: `
          <p>Good news! Your bonus and commission earnings have been restored.</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;border-left:4px solid #10B981;">
            <p style="margin:8px 0;"><strong>Status:</strong> Active</p>
            <p style="margin:8px 0;"><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>You can now earn referral, signup and commission bonuses as usual.</p>
        `,
      }).catch(err => console.log('Unpause bonus email error:', err.message))
    }

    // In-app notification
    if (user.receive_app_message) {
      await Notification.create({
        alert_username: user.email,
        alert_name: user.display_name,
        alert_date: new Date(),
        alert_user_id: user._id,
        alert_nature: `✅ Bonus Restored\nYour bonus earnings have been restored. You can now earn referral and commission bonuses.`,
        alert_status: 1,
        alert_read_date: '',
      })
    }

    return { success: true, message: 'User bonus restored successfully' }
  } catch (error) {
    console.log('unpauseUserBonus error:', error.message)
    return { success: false, message: error.message }
  }
}

// ------------------------------------------------
// Admin: Pause individual user COMMISSION earning
// Only blocks ongoing + promoter commission
// Does NOT block: referral bonus, signup bonus, coins
// ------------------------------------------------
const pauseUserCommission = async ({ userId, reason }) => {
  try {
    const user = await User.findById(userId)
    if (!user) return { success: false, message: 'User not found' }

    await User.findByIdAndUpdate(userId, {
      user_commission_paused: true,
      user_commission_pause_reason: reason || 'Paused by admin',
      user_commission_paused_at: new Date(),
    })

    // Send email
    if (user.receive_email_notification) {
      sendBonusEmail({
        userEmail: user.email,
        userName: user.display_name,
        subject: 'Important: Your Commission Earnings Have Been Paused',
        message: `
          <p>We are writing to inform you that your ongoing commission earnings have been temporarily paused.</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;border-left:4px solid #F59E0B;">
            <p style="margin:8px 0;"><strong>Reason:</strong> ${reason || 'Under review'}</p>
            <p style="margin:8px 0;"><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>During this period you will not receive ongoing commission from your referred users' transactions.</p>
          <p>Your referral bonus, signup bonus and coins earning are not affected.</p>
          <p>If you believe this is an error please contact our support team via your account dashboard.</p>
        `,
      }).catch(err => console.log('Pause commission email error:', err.message))
    }

    // In-app notification
    if (user.receive_app_message) {
      await Notification.create({
        alert_username: user.email,
        alert_name: user.display_name,
        alert_date: new Date(),
        alert_user_id: user._id,
        alert_nature: `⚠️ Commission Paused\nYour ongoing commission earnings have been temporarily paused. Reason: ${reason || 'Under review'}. Contact support for assistance.`,
        alert_status: 1,
        alert_read_date: '',
      })
    }

    return { success: true, message: 'User commission paused successfully' }
  } catch (error) {
    console.log('pauseUserCommission error:', error.message)
    return { success: false, message: error.message }
  }
}

// ------------------------------------------------
// Admin: Restore individual user COMMISSION earning
// ------------------------------------------------
const unpauseUserCommission = async ({ userId }) => {
  try {
    const user = await User.findById(userId)
    if (!user) return { success: false, message: 'User not found' }

    await User.findByIdAndUpdate(userId, {
      user_commission_paused: false,
      user_commission_pause_reason: '',
      user_commission_paused_at: null,
    })

    // Send email
    if (user.receive_email_notification) {
      sendBonusEmail({
        userEmail: user.email,
        userName: user.display_name,
        subject: '✅ Your Commission Earnings Have Been Restored',
        message: `
          <p>Good news! Your ongoing commission earnings have been restored.</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;border-left:4px solid #10B981;">
            <p style="margin:8px 0;"><strong>Status:</strong> Active</p>
            <p style="margin:8px 0;"><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>You will now receive ongoing commission from your referred users' transactions as usual.</p>
        `,
      }).catch(err => console.log('Unpause commission email error:', err.message))
    }

    // In-app notification
    if (user.receive_app_message) {
      await Notification.create({
        alert_username: user.email,
        alert_name: user.display_name,
        alert_date: new Date(),
        alert_user_id: user._id,
        alert_nature: `✅ Commission Restored\nYour ongoing commission earnings have been restored. You will now receive commission from your referred users' transactions.`,
        alert_status: 1,
        alert_read_date: '',
      })
    }

    return { success: true, message: 'User commission restored successfully' }
  } catch (error) {
    console.log('unpauseUserCommission error:', error.message)
    return { success: false, message: error.message }
  }
}

module.exports = {
  checkUserBonusEligibility,
  checkTransactionQualifies,
  processSignupBonus,
  processReferralBonus,
  pauseUserBonus,
  unpauseUserBonus,
  pauseUserCommission,
  unpauseUserCommission,
}