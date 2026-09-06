const mongoose = require('mongoose')

const systemSettingSchema = new mongoose.Schema({
    app_name: String,
    app_short_name: String,
    app_description: String,
    app_logo: String,
    app_main_logo: String,
    app_version: String,
    app_baseurl: String,
    app_paypayKey: String,
    app_textEditor_key: String,
    app_mode_message: String,
    app_minim_funding:{
        type: Number,
        default: 0.0
    },
    app_maxi_funding:{
        type: Number,
        default: 0.0
    },
    app_maxi_withdrawal:{
        type: Number,
        default: 0.0
    },
    app_mini_withdrawal:{
        type: Number,
        default: 0.0
    },
    app_paypal_bnt:{
        type: Boolean,
        default: false,
    },
    app_payStack_btn:{
        type: Boolean,
        default: false,
    },
    app_paypal_sale:{
        type: Boolean,
        default: false,
    },
    app_payoneer_sale:{
        type: Boolean,
        default: false,
    },
    app_bitcoin_sale:{
        type: Boolean,
        default: false,
    },
    app_paypal_buy:{
        type: Boolean,
        default: false,
    },
    app_payoneer_buy:{
        type: Boolean,
        default: false,
    },
    app_bitcoin_buy:{
        type: Boolean,
        default: false,
    },
    app_launch_title:{
        type: String,
        default: false,
    },
    app_launch_desc:{
        type: String,
        default: false,
    },
    app_update_note:{
        type: String,
       },
    app_update_btn_text:{
        type: String,
        },
    app_updateShowIcon:{
        type: String,
        },
    app_updateTitle:{
        type: String,
        },

    app_state: {
        type: String,
        default: 'Pending',
        },
    active: {
        type: Boolean,
        default: true
    },
    app_referral_bonus:{
        type: Boolean,
        default: false,
    },
    app_referral_percent:{
        type: Boolean,
        default: false,
    },
    app_signup_bonus:{
        type: Boolean,
        default: false,
    },
    app_new_signup_status:{
        type: Boolean,
        default: false,
    },
    app_stop_login_status:{
        type: Boolean,
        default: false,
    },
    app_operation_status:{
        type: Boolean,
        default: false,
    },
        app_operation_status:{
        type: Boolean,
        default: false,
    },
    // Ongoing purchase rewards toggle
    app_purchase_reward:{
        type: Boolean,
        default: false,
    },
    // Business promoter commission toggle
    app_promoter_bonus:{
        type: Boolean,
        default: false,
    },
        // Ongoing purchase rewards toggle
    app_purchase_reward:{
        type: Boolean,
        default: false,
    },
    // Business promoter commission toggle
    app_promoter_bonus:{
        type: Boolean,
        default: false,
    },

    // ── Signup Bonus Configuration ──────────────
    // Amount in USD admin wants to give as signup bonus
    signup_bonus_usd_amount: {
        type: Number,
        default: 0,
    },
    // Admin-defined conversion rate (₦ per $1)
    signup_bonus_conversion_rate: {
        type: Number,
        default: 0,
    },
    // Minimum transaction amount (₦) to unlock bonus
    signup_bonus_min_txn_amount: {
        type: Number,
        default: 0,
    },
    // Which service types qualify to unlock signup bonus
    // Admin selects from: paypal, payoneer, bitcoin,
    // airtime, data, electricity, tv_subscription, exam_cards
    // Default: only high-value buy/sell services
    signup_bonus_qualify_services: {
        type: [String],
        default: ['paypal', 'payoneer', 'bitcoin'],
    },

    // ── Referral Bonus Configuration
    // Amount in USD admin wants to give as referral bonus
    referral_bonus_usd_amount: {
        type: Number,
        default: 0,
    },
    // Admin-defined conversion rate (₦ per $1)
    referral_bonus_conversion_rate: {
        type: Number,
        default: 0,
    },
    // Minimum transaction amount (₦) to unlock referral bonus
    referral_bonus_min_txn_amount: {
        type: Number,
        default: 0,
    },
    // Which service types qualify to unlock referral bonus
    // Admin selects from: paypal, payoneer, bitcoin,
    // airtime, data, electricity, tv_subscription, exam_cards
    // Default: only high-value buy/sell services
    referral_bonus_qualify_services: {
        type: [String],
        default: ['paypal', 'payoneer', 'bitcoin'],
    },
    createdBy: String,

    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('app_setting', systemSettingSchema)