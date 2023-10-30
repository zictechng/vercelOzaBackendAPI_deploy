const mongoose = require('mongoose');

const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema

const transferSchema = new Schema({
    acct_name: String,
    acct_number: String,
    swift_code: String,
    amount: {
        type: Number,
        default:0.0
    },
    bank_name: String,
    bank_address: String,
    sender_name: String,
    sender_acct_number: String,
    sender_currency_type: String,
    tran_type: String,
    transac_nature: String,
    tran_desc: String,
    trans_balance: 
    {
        type: Number,
        default:0.0
    },
    tr_year: String,
    colorcode: String,
    createdBy: String,
    transaction_status:{
        type: String, default: 'Pending'
    },
    tid: String,
    tr_year: String,
    tr_month: String,
    tr_day: String,
    checked: Boolean,
    addeby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
        // this will get the user ID automatically by mongoose in nodejs
    },
    createdOn: {type: Date, default: Date.now},
    creditOn: {type: Date, default: Date.now},
});

transferSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('fund_transfer', transferSchema);