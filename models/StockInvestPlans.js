const mongoose = require('mongoose')

const stockInvestPlanSchema = new mongoose.Schema({

    starter_plan: String,
    premier_plan: String,
    gold_plan: String,
    createdOn: {type: Date, default: Date.now},

})

// export it
module.exports = mongoose.model('stock_plan', stockInvestPlanSchema)