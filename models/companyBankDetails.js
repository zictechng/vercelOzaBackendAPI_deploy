const mongoose = require('mongoose')

const companyBankInfoSchema = new mongoose.Schema({
    company_bank1: String,
    company_acct_number1: String,
    company_acct_name1: String,
    company_bank2: String,
    company_acct_number2: String,
    company_acct_name2: String,
    company_desc: String,
    company_btc_address: String,
    company_paypal_address: String,
    company_payoneer_address: String,
    company_momoAccount: String,
    company_bank3: String,
    company_acct_number3: String,
    company_acct_name3: String,
    
    createdOn: {type: Date, default: Date.now},
})

// export it
module.exports = mongoose.model('Company_bankInfo', companyBankInfoSchema)