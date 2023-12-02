const jwt = require("jsonwebtoken");
const User = require("../models/User");
exports.isAuth = async (req, res, next) =>{
    //console.log("Access request ", req.headers.authorization )
    if(req.headers && req.headers.authorization){
        let token = req.headers.authorization.split(' ')[1];
        // to handle some errors case that might occurred that you might not know, use try catch
        try {
            let payload = jwt.verify(token, process.env.SECRET_LOGIN_KEY);
            let user = await User.findById(payload.userId)
            if(!user) {
                return res.json({status: 401, message: ' Access denied'});
            }
            req.user = user;
            next();
            
        } catch (error) {
            if(error.name === 'JsonWebTokenError'){
                return res.json({status: 401, message: ' Invalid authorization'});
            }
            // to check if token has expired error message
            if(error.name === 'TokenExpiredError'){
                return res.json({status: 402, message: ' Session has expired, login again'});
            }
        }
             //return res.json({status: 500, message: ' Internal Server Error occurred'});
    } else{
        return res.json({status: 401, message: ' Unauthorized'});
    }
}
