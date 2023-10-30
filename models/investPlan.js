const mongoose = require('mongoose')

const investmentPlanSchema = new mongoose.Schema({
    sender_name: String,
    email: String,
    plan_type: String,
    investment_name: String,
    investment_duration: String,
    invest_amt: {
        type: Number,
        default: '0.0',
        },
    username: {
        type: String,
    },
    
    invest_status: {
        type: String,
        default: 'Pending',
        },
   
    active: {
        type: Boolean,
        default: true
    },
    createdBy: String,
    invest_id: String,
    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('investment_plan', investmentPlanSchema)