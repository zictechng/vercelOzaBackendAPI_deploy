const mongoose = require('mongoose')

const referralUserSchema = new mongoose.Schema({
    ref_mainEmail: String,
    ref_mainTag: String,
    ref_userEmail: String,
    ref_userName: String,
    ref_status: String,
    ref_amt: {
        type: Number,
        default: 0.0,
    },
    ref_state: {
        type: Boolean,
        default: false,
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId, // Change the type to ObjectId
        ref: 'User', // Assuming 'User' is the name of your User model
    },
    
    ref_approvedDate: {type: Date},

    createdOn: {type: Date},
 })

// export it
module.exports = mongoose.model('referral', referralUserSchema)