const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const systemActivityLogSchema = new mongoose.Schema({
    log_username: String,
    log_name: String,
    log_acct_number: String,
    log_receiver_name: String,
    log_receiver_number: String,
    log_receiver_bank: String,
    log_country: String,
    log_swift_code: String,
    log_desc: String,
    log_amt: {
        type: Number,
        default: 0,
        },
    log_status:{
        type: String
    },
    log_nature:{
        type: String
    },
createdOn: {type: Date, default: Date.now},
 })
 systemActivityLogSchema.plugin(mongoosePaginate)
// export it
module.exports = mongoose.model('system_activity_log', systemActivityLogSchema)