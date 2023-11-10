const mongoose = require('mongoose')

const aboutUsSchema = new mongoose.Schema({
    company_name: String,
    company_regId: String,
    company_address: String,
    company_phone: String,
    company_email: String,
    company_title: String,
    company_desc: String,
    company_location: String,
    user_role:{
        type: String, 
        default: 'User'
    },
    createdOn: {type: Date, default: Date.now},
})

// export it
module.exports = mongoose.model('AboutCompany', aboutUsSchema)