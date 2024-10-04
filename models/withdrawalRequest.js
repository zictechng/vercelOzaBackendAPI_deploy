const mongoose = require('mongoose');

const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema

const withdrawalRequestSchema = new Schema({
    withdrawal_name: String,
    withdrawal_tid: String,
    withdrawal_tag_id: String,
    amount: {
        type: Number,
        default:0.0
    },
    withdrawal_email: String,
    withdrawal_note: String,
    withdrawal_type: {
        type: String,
        default:'Withdraw'
    },
    withdrawal_status:{
        type: String,
        default:'Pending',
    },
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
    approved_date: {type: Date},
});

withdrawalRequestSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('withdrawal_request', withdrawalRequestSchema);