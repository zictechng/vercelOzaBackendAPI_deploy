const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema({
    subject: String,
    sender_name: String,
    email: String,
    ticket_message: String,
    ticket_status: {
        type: String,
        default: 'Pending',
        },
    ticket_type: {
        type: String,
        },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: String,

    addeby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
        // this will get the user ID automatically by mongoose in nodejs
    },
    
    tick_id: String,
    tick_date: String,
    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('ticket', ticketSchema)