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
    createdBy: String,

    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('app_setting', systemSettingSchema)