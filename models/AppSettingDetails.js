const mongoose = require('mongoose')

const systemSettingSchema = new mongoose.Schema({
    app_name: String,
    app_short_name: String,
    app_description: String,
    app_logo: String,
    app_version: String,
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
    createdBy: String,

    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('app_setting', systemSettingSchema)