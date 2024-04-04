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
    document_type:{
        type: 'string',
        },
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    owners_name:{
        type: 'string',
    },
    owners_email:{
        type: 'string',
    },
    owners_tag_id:{
        type: 'string',
    },
    document_action:{
        type: 'string',
    },
    document_status:{
        type: 'string',
    },
    reject_document_reason:{
        type: 'string',
    },
    track_document:{
        type: 'string',
    },
    createdOn: {type: Date, default: Date.now},
    action_date: {type: Date},
    addeby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
        // this will get the user ID automatically by mongoose in nodejs
    },
})

// export it
module.exports = mongoose.model('document_upload', DocumentUploadSchema)