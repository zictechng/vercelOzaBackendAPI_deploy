const mongoose = require('mongoose')

// this will enable you to auto generate serial ID number for any record created
// just like ticket number or invoice number
const AutoIncrement = require('mongoose-sequence')(mongoose)

const noteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            require: true,
            ref: 'User'
            // this will get the user ID automatically by mongoose in nodejs
        },
        title: {
            type: String,
            require: true
        },
        text: {
            type: String,
            require: true
        },
        completed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)

// create the function for auto ID generating here
noteSchema.plugin(AutoIncrement, {
    inc_field: 'ticket',
    id: 'ticketNums',
    start_seq: 500
})

// export it
module.exports = mongoose.model('Note', noteSchema)