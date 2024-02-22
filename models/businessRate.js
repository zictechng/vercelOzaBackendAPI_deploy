const mongoose = require('mongoose')

const DealingRateSchema = new mongoose.Schema({
    btc_selling: String,
    btc_buying: String,
    paypal_selling: String,
    paypal_buying: String,
    payoneer_selling: String,
    payoneer_buying: String,
    bonus_rate: {
        type: Number,
        default: 0.0,
    },
    signup_bonus_rate: {
        type: Number,
        default: 0.0,
    },
    app_status: {
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
module.exports = mongoose.model('business_Rate', DealingRateSchema)