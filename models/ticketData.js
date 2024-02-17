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

    ticket_closed: {
        type: String,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId, // Change the type to ObjectId
        ref: 'User', // Assuming 'User' is the name of your User model
       },

    addeby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
        // this will get the user ID automatically by mongoose in nodejs
    },
    tick_id: String,
    tick_response_date: {type: Date},
    createdOn: {type: Date},
 })

// export it
module.exports = mongoose.model('ticket', ticketSchema)