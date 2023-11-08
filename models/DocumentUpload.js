const mongoose = require('mongoose')

const DocumentUploadSchema = new mongoose.Schema({

    document_name:{
        type: 'string',
    },
    document_category:{
        type: 'string',
    },
    document_url:{
        type: 'string',
        },
    user_id:{
        type: 'string',
    },
    document_action:{
        type: 'string',
    },
    document_status:{
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
module.exports = mongoose.model('document_upload', DocumentUploadSchema)