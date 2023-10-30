const mongoose = require('mongoose')

const investorsCreditSchema = new mongoose.Schema({
    receiver_name: String,
    receiver_email: String,
    plan_type: String,
    investment_name: String,
    investment_duration: String,
    investment_notes: String,
    transaction_type: String,
    roi_amt: {
        type: Number,
        default: '0.0',
        },
    credit_status: {
        type: String,
        default: 'Pending',
        },
    receiver_id: String,
    investment_id: String,
    addedBy: String,
    tid: String,
    post_date:{type: Date},
    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('investors_earning', investorsCreditSchema)