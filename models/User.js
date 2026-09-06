const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    display_name: String,
    gender: String,
    dob: String,
    email: String,
    phone: String,
    state: String,
    city: String,
    currency_type: String,
    acct_type: String,
    username: {
        type: String,
    },
    verify2fa_code: {
        type: String,
    },
    receive_email_notification: {
        type: Boolean,
        default: false,
    },
    activate_2fa_login: {
        type: Boolean,
        default: false,
    },
    receive_app_message: {
        type: Boolean,
        default: false,
    },
    password: {
        type: String,
        require: true
    },
    password_plain: {
        type: String,
        },
    country: String,
    address: String,
    profile_photo: String,
    acct_cot_pin:  String,
    reg_stage1: {
        type: String,
        default: 'Yes',
    },
    reg_stage2:{
        type: String,
        default: '',
    },
    reg_stage3:{
        type: String,
        default: '',
    },
    reg_stage4:{
        type: String,
        default: '',
    },
    reg_stage5:{
        type: String,
        default: '',
    },
    reg_stage6:{
        type: String,
        default: '',
    },
    acct_tax_code: String,
    acct_status: {
        type: String,
        default: 'Pending',
        },
    acct_active_status: {
        type: String,
        default: 'none',
        },
    acct_approved_status: {
            type: String,
            default: 'none',
            },
    amount: {
        type: Number,
        //type: mongoose.SchemaTypes.Mixed,
        default: 0.0,   
    },
    all_withdraw_acct: {
        type: Number,
        //type: mongoose.SchemaTypes.Mixed,
        default: 0.0,   
    },
    all_bonus_acct: {
        type: Number,
        default: 0.0,
    },
     coins: {
        type: Number,
        default: 0,
    },
    // Tag ID of the business promoter who referred this user
    // Empty if no promoter
    promoter_tag_id: {
        type: String,
        default: '',
    },
    // User role — User | Admin | Promoter
    // Promoter earns ongoing commission on referred users
    business_promoter: {
        type: Boolean,
        default: false,
    },
        // Tag ID of the business promoter who referred this user
    // Empty if no promoter
    promoter_tag_id: {
        type: String,
        default: '',
    },
    // User role — User | Admin | Promoter
    // Promoter earns ongoing commission on referred users
    business_promoter: {
        type: Boolean,
        default: false,
    },

    // ── Signup Bonus
    // Pending signup bonus in USD (set on registration)
    // Converted to ₦ and credited when qualifying txn made
    pending_signup_bonus_usd: {
        type: Number,
        default: 0,
    },
    // Whether signup bonus has been activated and credited
    signup_bonus_activated: {
        type: Boolean,
        default: false,
    },

    // ── Individual Bonus Control
    // Admin can pause individual user from receiving ANY bonus
    user_bonus_paused: {
        type: Boolean,
        default: false,
    },
    // Reason admin paused this user's bonus
    user_bonus_pause_reason: {
        type: String,
        default: '',
    },
    // Date when bonus was paused
    user_bonus_paused_at: {
        type: Date,
        default: null,
    },
    acct_balance: {
        type: Number,
        default: 0.0,
    },

    tran_account: {
        type: Number,
        default: 0.0,
    },
    signup_account: {
        type: Number,
        default: 0.0,
    },
    active: {
        type: Boolean,
        default: true
    },
    tag_id:{
        type: String,
    },
    last_transaction: {
        type: Number,
        default: 0.0,
    },
    reg_otp:{
        type: String,
    },
    reg_otp_send:{
        type: String,
    },
    user_role:{
        type: String, 
        default: 'User'
    },
    createdOn: {type: Date, default: Date.now},
})

// export it
module.exports = mongoose.model('User', userSchema)