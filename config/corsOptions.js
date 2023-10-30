const allowedOrigins = require('./allowedOrigins')

const corsOptions = {
    origin: (origin, callback) =>{
        if (allowedOrigins.indexOf(origin) !== -1 || !origin){
            // !origin will allowed postman and other localhost server have access to your api
            callback(null, true)
        } else{
            callback(new Error('Not allowed by CORS'))
        }
    },

    // set application credential
    credential: true,
    optionsSuccessStatus: 200
}

// export the function
module.exports = corsOptions