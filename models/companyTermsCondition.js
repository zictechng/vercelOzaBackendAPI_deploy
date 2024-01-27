const mongoose = require('mongoose')

const companyTermConditionSchema = new mongoose.Schema({
    term_condition: String,
    user_policy: String,
    policy_status: {
        type: String,
        default: 'Pending',
        },
    term_status: {
        type: String,
        default: 'Pending',
        },
   createdBy: String,
    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('terms_condition', companyTermConditionSchema)