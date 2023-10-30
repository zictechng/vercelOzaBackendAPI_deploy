const mongoose = require('mongoose')

const fxInvestPlanSchema = new mongoose.Schema({

    starter_plan: String,
    premier_plan: String,
    gold_plan: String,
    createdOn: {type: Date, default: Date.now},

})

// export it
module.exports = mongoose.model('fx_plan', fxInvestPlanSchema)