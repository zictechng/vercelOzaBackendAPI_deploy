const mongoose = require('mongoose');

const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema

const fundAccountSchema = new Schema({
    fund_name: String,
    fund_number: String,
    fund_tag_id: String,
    amount: {
        type: Number,
        default:0.0
    },
    fund_email: String,
    fund_note: String,
    fund_method: String,
    fund_payment_proof_url:{
        type: String,
        default:''
    },
    fund_type: {
        type: String,
        default:'Account Funding'
    },
    fund_status: String,
    checked:{
       type: Boolean,
       default:false 
    },
    addeby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
        // this will get the user ID automatically by mongoose in nodejs
    },
    createdOn: {type: Date, default: Date.now},
    creditOn: {type: Date, default: Date.now},
});

fundAccountSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('fund_account', fundAccountSchema);