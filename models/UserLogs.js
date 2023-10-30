const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');
const userLogSchema = new mongoose.Schema({
    login_username: String,
    login_name: String,
    login_user_ip: String,
    login_country: String,
    login_browser: String,
    login_date:{
        type: Date
    },
    logout_date:{
        type: Date
    },
    login_nature: String,
    login_token: String,
    user_log_id: String,
    login_status: {
        type: Number,
        default: 0,
        },
createdOn: {type: Date, default: Date.now},
 })
 userLogSchema.plugin(mongoosePaginate)
// export it
module.exports = mongoose.model('user_log', userLogSchema)