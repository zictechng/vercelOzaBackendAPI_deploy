const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');
const notificationAlertSchema = new mongoose.Schema({
    alert_username: String,
    alert_name: String,
    alert_user_ip: String,
    alert_country: String,
    alert_browser: String,
    alert_device_ip: String,
    alert_device_name: String,
    alert_date:{
        type: Date
    },
    alert_read_date:{
        type: Date
    },
    alert_nature: String,
    alert_user_id: String,
    alert_status: {
        type: Number,
        default: 0,
        },
createdOn: {type: Date, default: Date.now},
 })
 notificationAlertSchema.plugin(mongoosePaginate)
// export it
module.exports = mongoose.model('notification', notificationAlertSchema)