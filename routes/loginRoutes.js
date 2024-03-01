const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const User = require('../models/User');
const SystemActivity = require('../models/SystemActivityLogs');
const UserLogs = require('../models/UserLogs')
const AppSetting = require('../models/AppSettingDetails')

const nodemailer = require("nodemailer");
const transporter = require('../controllers/mailSender');
const { isAuth } = require('../middleware/auth');
const { mailTemplate } = require('../middleware/emailTemplate');
const contentMail = require('../middleware/emailTemplate');
const { welcomeEmail } = require('../middleware/welcome');
const { loginEmail, loginText } = require('../emailTemplate/emailLogin');
const { passwordResetEmail, passwordResetText } = require('../emailTemplate/emailPasswordReset');
const { fetchApp } = require('../middleware/appDetails');
// this function verify if the token user sent is valid
function verifyToken(req, res, next) {
    if (!req.headers.authorization){
      return res.status(401).send({msg: '401'})
    }
    let token = req.headers.authorization.split(' ')[1];
    if(token === null || token === ''){
      return res.status(401).send({msg: '401'})
    }
    let payload = jwt.verify(token, process.env.SECRET_LOGIN_KEY);
    if(!payload){
  
      console.log('Not verify respond ', res);
  
      return res.status(401).send({msg: '401'});
    }
    req.userId = payload.subject
    next();
  }
   // generate registration OTP Code here
   function generateRandomNumber() {
    return Math.floor(100000 + Math.random() * 900000);
    }
    var appName = '';
// route to login user
router.post("/login", async (req, res, next) => {
    const file = req.file;
    const filter = req.body;
    //console.log("Login Data ", req.body);
    //check in input fields is empty
    if(filter.username == '' || filter.password == ''){
        return res.json({status: 400, message: ' All fields are required'})
        //return res.status(400).json({msg: '400'}) //Fields required
    } 
    try {
    // Check if user exist
    const userExist = await User.findOne({email: filter.username})
    const getAppSetting = await AppSetting.findOne();
    
    if(!userExist){
        //console.log('Wrong username entered!');
            return res.json({status: 401, message: ' User not found'})
        }
    if(userExist.acct_status != 'Active' || userExist.acct_status == ''){
        //console.log('Wrong username entered!');
            return res.json({status: 402, message: ' Account not active'})
      }
        
    // compare the password against what was passed from the request body
    bcrypt.compare(req.body.password, userExist.password, function(err, matches) {
        if (err){
        return res.json({status: 403, message: ' Error occured'})
        //return res.status(403).json({msg: '403'}); // error occurred
        }
            
        if (!matches){
            return res.json({status: 404, message: ' Wrong password entered'})
            //res.status(404).json({msg: '404'}); // wrong password entered
            //console.log('The password does NOT match!');
        }
        else {
            const token = jwt.sign({userId:userExist._id}, process.env.SECRET_LOGIN_KEY,
                {expiresIn:'1d'});
            // get system settings here
             const { password, password_plain, ...others } = userExist._doc; // this will remove password from the details send to server.
            // create log here
        const addLogs = SystemActivity.create({
            log_username: userExist.email,
            log_name: userExist.display_name,
            log_acct_number: userExist.tag_id,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Account login successfully',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User login',
        })

        // user logs status here.
        const userLogs = UserLogs.create({
            login_username: userExist.email,
            login_name: userExist.display_name,
            login_user_ip: '',
            login_country: '',
            login_browser: '',
            login_date:  Date.now(),
            user_log_id: userExist._id,
            logout_date: '',
            login_nature: 'User logged in',
            login_token: token,
            login_status: 1
        });
            // send email notification
            fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

                const mailBody = loginEmail(appName, 'Login Authentication', userExist.display_name, 'this is to notify you that your account has just been logged into successfully, If this is not you, contact support for immediate intervention, thank you.', logoImage);
                const TextBody = loginText(userExist.display_name,);
                let mailOptions = {
                    from: `${appName+' Support'} <noreply@ozaapp.com>`,
                    to: userExist.email,
                    subject: 'Account login notification!',
                    text: TextBody,
                    html: mailBody,
                }
                async function main() {
                    // send mail with defined transport object
                const info = await transporter .sendMail(mailOptions);
                }
                main().catch('Email Message Error', console.error);
    
               }).catch(console.error.bind(console))
            res.send({ msg: '200', token: token, userData: others, appData: getAppSetting})
        //res.json({msg: 200, token: token, userData: others})
        //console.log('Environment data!', process.env.SECRET_KEY);
        }
    });
        } catch (err) {
        res.status(500).send({ msg: "500" });
        }
    });

    // route to login user
// router.post("/google_login", passport.authenticate('google'), async (req, res, next) => {
//     const file = req.file;
//     const filter = req.body;
//             //console.log("Login Data ", req.body);
//          //check in input fields is empty
//     if(filter.username == '' || filter.password == ''){
//         return res.json({status: 400, message: ' All fields are required'})
//         //return res.status(400).json({msg: '400'}) //Fields required
//     } 
//     try {
//     // Check if user exist
//     const userExist = await User.findOne({email: filter.username})
//     const getAppSetting = await AppSetting.findOne();
   
//             res.send({ msg: '200', token: token, userData: others, appData: getAppSetting})
//         //res.json({msg: 200, token: token, userData: others})
//         //console.log('Environment data!', process.env.SECRET_KEY);
//         }
//          catch (err) {
//         res.status(500).send({ msg: "500" });
//         }
//     });
    
    // route to logout user
router.get("/user_logout/:id", async (req, res, next) => {
    let myId = req.params.id;

    var today = new Date();
    var month = today.toLocaleString('default', { month: 'long' });
       // console.log("User ID", req.params.id);
        try {
            const userData = await User.find({_id: req.params.id });
            const userLogs = await UserLogs.find({user_log_id: req.params.id });
            //console.log("User log Details ", userLogs)
            const filter = { user_log_id: req.params.id, login_status: 1 };
            if(!userLogs) {
            res.status(404).json({ msg: '404' })
            }
            else if(userLogs){
            const addLogs = SystemActivity.create({
                log_username: userData.username,
                log_name: userData.surname+' '+userData.first_name,
                log_acct_number: userData.acct_number,
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Account logout successfully',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'User logout',
            });
            // update user logs details
                const updateDoc = {
                    $set: {
                      login_status: 0,
                      logout_date: Date.now(),
                      login_nature: "Logout"
                     },
                  }
            const result = await UserLogs.updateMany(filter, updateDoc);
            //console.log("Result Details", result);
            res.status(200).send({msg: '200'});
            }
        } catch (err) {
            res.status(500).json(err);
            console.log(err.message);
        }
    });
    

    // verify user login state if it is valid or not
router.get("/authenticate_user/:id", isAuth, async (req, res, next) =>{

    const userId = req.params.id
    //console.log(req.params.id);
    try {
        // Check if user exist
        if(userId =='' || userId == null){
            return res.json({status: 404, message: ' User Account not found'});
        }
        else if(userId){
            res.send({ msg: '200'})
        }
    } catch (err) {
        console.log('Server error : ', err.message)
        return res.json({status: 500, message:err.message})
        }
    

    })

// route to verify user account (OTP)

router.post("/otp_verify", async (req, res) => {
    //const file = req.file;
    const filter = req.body ;
    const filterUser = { email: req.body.user_email };
    //console.log("OTP Data from APP", req.body);

       //check in input fields is empty
    if(filter.otp_code == '' || filter.user_email == ''){
        return res.json({status: 400, message: 'Some fields are missing'})
        } 
    
    try {
    // Check if user exist
    const userExist = await User.findOne({email: filter.user_email})
    
    if(!userExist){
        //console.log("OTP Data from APP", userExist);
        return res.json({status: 401, message: ' User not found'})
        }
    // compare the the OTP against what was passed from the request body
    const matches = filter.otp_code == userExist.reg_otp;
    // set information to update table row
    const updateActStatus = {
        $set: {
        acct_status:'Active',
        },
        };

        if (!matches){
            //console.log("OTP not matched ");
            return res.json({status: 404, message: ' Invalid otp code'})
            }
        else if(matches){
                // just update one row
        const updateUserNow = await User.updateOne(filterUser, updateActStatus);
        // create log here
            const addLogs = SystemActivity.create({
            log_username: userExist.email,
            log_name: userExist.display_name,
            log_acct_number: '',
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Account activated successfully',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User activate account',
            })
            fetchApp().then((result) =>{
            appName = result.app_name
            appLogo = result.app_logo
            const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

            const mailBody = loginEmail(appName, 'Account Activated', userExist.display_name, 'this is to notify you that your account has been activated successfully, You can now be able to login use your account, thank you.', logoImage);
            const TextBody = loginText(userExist.display_name,);
            let mailOptions = {
                from: `${appName +' Support'} <noreply@ozaapp.com>`,
                to: userExist.email,
                subject: 'Oza Account Activation!',
                text: TextBody,
                html: mailBody,
            }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                const info = await transporter.sendMail(mailOptions);
                }
            main().catch('Message Error', console.error);

        }).catch(console.error.bind(console))
            
            //res.status(200).json({ msg: '200'}) // success message
            res.send({ msg: '200'})
        }
        else{
            console.log('OTP Operation: Something went wrong');
        }
        } catch (err) {
    res.status(500).send({ msg: "500" });
    }
    });

    // forget password route reset here
router.post("/forgetPasswordMobile", async (req, res) => {
        //const file = req.file;
        const filter = req.body ;
        const filterUser = { email: req.body.user_email };
        const otpCode = generateRandomNumber()
           //check in input fields is empty
        if(filter.user_email == '' || filter.user_email == null){
            return res.json({status: 400, message: 'Some fields are missing'})
            } 
        
        try {
        // Check if user exist
        const userExist = await User.findOne({email: filter.user_email})
        
        if(!userExist){
            //console.log("OTP Data from APP", userExist);
            return res.json({status: 404, message: ' User not found'})
            }
            else if(userExist){
                    // just update one row
            //const updateUserNow = await User.updateOne(filterUser, updateActStatus);
            // create log here
                const addLogs = SystemActivity.create({
                log_username: userExist.username,
                log_name: userExist.display_name,
                log_acct_number: '',
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Requested password reset operation',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Passwords reset request',
                })
                fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

                const mailBody = passwordResetEmail(appName, 'Forget password reset', userExist.display_name, 'this is to notify you that your account has been requested to reset password, If this is not your, contact our support immediately. \n', otpCode, logoImage)
                const TextBody = passwordResetText(userExist.display_name, otpCode);
                let mailOptions = {
                from: `${appName +' Support'} <noreply@ozaapp.com>` ,
                to: userExist.email,
                subject: 'Forget password reset!',
                text: TextBody,
                html: mailBody,
            }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                const info = await transporter.sendMail(mailOptions);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
         //res.status(200).json({ msg: '200'}) // success message
                
            res.send({ msg: '200', otpPin: otpCode, myEmail:userExist.email })
            }
            else{
                console.log('OTP Operation: Something went wrong');
            }
            } catch (err) {
        res.status(500).send({ msg: "500" });
        }
        });

        // forget password route reset here
router.post("/resetPasswordMobile", async (req, res) => {
    //const file = req.file;
    const filter = req.body ;
    const filterUser = { email: req.body.userEmail };
     //check in input fields is empty
            if(filter.userEmail == '' || filter.userEmail == null){
                return res.json({status: 400, message: 'Some fields are missing'})
               } 
            
            try {
                // Check if user exist
                const userExist = await User.findOne({email: filter.userEmail})
            
                if(!userExist){
                    //console.log("OTP Data from APP", userExist);
                return res.json({status: 404, message: ' User not found'})
                }
                else if(userExist){
                    // just update one row
                // hash the password here
                const hashedPwd = await bcrypt.hash(req.body.password, 10) // salt rounds
                // set information to update table row
                const updatePassAccount = {
                    $set: {
                        "password": hashedPwd, 
                        "password_plain": req.body.password,
                    },
                };
            
                const updateUserNow = await User.updateOne(filterUser, updatePassAccount);
            
                if(updateUserNow){
                       // create log here
                 const addLogs = SystemActivity.create({
                    log_username: userExist.email,
                    log_name: userExist.display_name,
                    log_acct_number: '',
                    log_receiver_name: '',
                    log_receiver_number: '',
                    log_receiver_bank: '',
                    log_country: '',
                    log_swift_code: '',
                    log_desc:'Password updated successfully',
                    log_amt: '',
                    log_status: 'Successful',
                    log_nature:'User update password',
                    })
                 // async..await is not allowed in global scope, must use a wrapper
                
                 // get app details and send mail
                 fetchApp().then((result) =>{
                    appName = result.app_name
                    appLogo = result.app_logo
                    const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

                    const mailBody = loginEmail(appName, 'Password reset successfully', userExist.display_name, 'this is to notify you that your account password has been reset, If this is not you, contact our support immediately. \n', logoImage)
                    const TextBody = loginText(userExist.display_name, 'this is to notify you that your account password has been reset, If this is not you, contact our support immediately');
                    let mailOptions = {
                        from: `${appName +' Support'} <noreply@ozaapp.com>`,
                        to: userExist.email,
                        subject: 'Password reset successfully!',
                        text: TextBody,
                        html: mailBody,
                    }
                    async function main() {
                    const info = await transporter.sendMail(mailOptions);
                    }
                main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
 
                //res.status(200).json({ msg: '200'}) // success message
                    res.send({ msg: '200'}) 
                    }
                }
                else{
                    console.log('Password reset : Something went wrong');
                }
            } catch (err) {
             //res.status(500).send({ msg: "500" });
             console.log('Server error : ', err.message)
             return res.json({status: 500, message:err.message})
        }
    });

// Webbiit youtube app forget password route reset here
router.post("/forgetPasswordWebbiit", async (req, res) => {
        //const file = req.file;
        console.log(req.body);
        const filter = req.body ;
        const filterUser = { email: req.body.userEmail };
         //check in input fields is empty
if(filter.userEmail == '' || filter.userEmail == null){
    return res.json({status: 400, message: 'Some fields are missing'})
    } 

try {
    // Check if user exist
    const userExist = await User.findOne({email: filter.userEmail})

    if(!userExist){
        //console.log("OTP Data from APP", userExist);
    return res.json({status: 404, message: ' User not found'})
    }
    else if(userExist){
        // just update one row
    // hash the password here
    const hashedPwd = await bcrypt.hash(req.body.password, 10) // salt rounds
    // set information to update table row
    const updatePassAccount = {
        $set: {
            "password": hashedPwd, 
            "password_plain": req.body.password,
        },
    };

    const updateUserNow = await User.updateOne(filterUser, updatePassAccount);

    if(updateUserNow){
            // create log here
        const addLogs = SystemActivity.create({
        log_username: userExist.email,
        log_name: userExist.display_name,
        log_acct_number: '',
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Webbit youtube app password updated successfully',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'User update password',
        })
        // async..await is not allowed in global scope, must use a wrapper
    
        // get app details and send mail
        fetchApp().then((result) =>{
        appName = 'Webbiit Technology'
        const mailBody = loginEmail(appName, 'Password reset successfully', userExist.display_name, 'this is to notify you that your account password has been reset, If this is not you, contact our support immediately. \n')
        const TextBody = loginText(userExist.display_name, 'this is to notify you that your account password has been reset, If this is not you, contact our support immediately');
        let mailOptions = {
            from: `${appName +' Support'} <noreply@ozaapp.com>`,
            to: userExist.email,
            subject: 'Password reset successfully!',
            text: TextBody,
            html: mailBody,
        }
        async function main() {
        const info = await transporter.sendMail(mailOptions);
                }
            main().catch('Message Error', console.error);
        }).catch(console.error.bind(console))

            //res.status(200).json({ msg: '200'}) // success message
                res.send({ msg: '200'}) 
                }
            }
            else{
                console.log('Password reset : Something went wrong');
            }
        } catch (err) {
            //res.status(500).send({ msg: "500" });
            console.log('Server error : ', err.message)
            return res.json({status: 500, message:err.message})
        }
 });


module.exports = router;