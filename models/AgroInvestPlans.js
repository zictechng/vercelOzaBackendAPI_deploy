const mongoose = require('mongoose')

const angroInvestPlanSchema = new mongoose.Schema({

    starter_plan: String,
    premier_plan: String,
    gold_plan: String,
    createdOn: {type: Date, default: Date.now},

})

// export it
module.exports = mongoose.model('angro_plan', angroInvestPlanSchema)