const mongoose = require('mongoose')

//mongodb+srv://angular_bank_demo:B8IS5Lmm03KVpO83@cluster0.utkcye8.mongodb.net/angularBankDemo?retryWrites=true&w=majority
//mongodb+srv://oza_userApp:ibUfla7pmE8GI8i6@cluster0.ha6y1yt.mongodb.net/oza_DB

//mongodb://atlas-sql-653f9715e32c780fc8a17ee2-cjqct.a.query.mongodb.net/oza_DB?ssl=true&authSource=admin

const connectDB = async() =>{
    try{
        await mongoose.connect(process.env.DATABASE_URI)
    }
    catch(err){
        console.log('DB Connection Failed: ', err)
    }
}

// then export module

module.exports = connectDB;