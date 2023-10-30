const mongoose = require('mongoose')

const systemSettingSchema = new mongoose.Schema({
    app_name: String,
    app_short_name: String,
    app_logo: String,
    ticket_status: {
        type: String,
        default: 'Pending',
        },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: String,

    createdOn: {type: Date, default: Date.now},
 })

// export it
module.exports = mongoose.model('app_setting', systemSettingSchema)