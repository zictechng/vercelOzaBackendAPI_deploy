const mongoose = require('mongoose')

const userBankDetailSchema = new mongoose.Schema({

    bank_name:{
        type: 'string',
    },
    bank_acct_name:{
        type: 'string',
        },
    bank_acct_number:{
        type: Number,
    },
    paypal_address: String,
    
    payoneer_address: String,
    
    btc_address: String,
    
    user_id:{
        type: 'string',
    },
    bank_action:{
        type: 'string',
    },
    bank_status:{
        type: 'string',
    },
    createdOn: {type: Date, default: Date.now},
    addeby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
        // this will get the user ID automatically by mongoose in nodejs
    },
})

// export it
module.exports = mongoose.model('userBank_details', userBankDetailSchema)