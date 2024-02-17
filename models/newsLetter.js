const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');
const newsLetterAlertSchema = new mongoose.Schema({
    user_email: String,
    alert_read_date:{
        type: Date
    },
    createdOn: {
        type: Date,
    },
 })
 newsLetterAlertSchema.plugin(mongoosePaginate)
// export it
module.exports = mongoose.model('newsLetter', newsLetterAlertSchema)