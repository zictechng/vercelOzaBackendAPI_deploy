const mongoose = require('mongoose')

const accountOfficerSchema = new mongoose.Schema({
    surname: String,
    first_name: String,
    gender: String,
    email: String,
    staff_type: String,
    staff_id: String,
    username: {
        type: String,
    },
    
    branch: String,
    address: String,
    image_photo: String,
    bank_name:  String,
    acct_status: {
        type: String,
        default: 'Pending',
        },
   
    active: {
        type: Boolean,
        default: true
    },
    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('account_officer', accountOfficerSchema)