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

   // generate registration OTP Code here
   function generateRandomNumber() {
    return Math.floor(100000 + Math.random() * 900000);
    }
    var appName = '';

 // route to login user
 router.post("/loginAdmin", async (req, res, next) => {
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
      if(userExist.user_role != 'Admin' || userExist.user_role == ''){
        //console.log('Wrong username entered!');
            return res.json({status: 402, message: ' Admin authentication failed'})
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
            log_name: ''+userExist.display_name,
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
            login_name: userExist.surname + ' ' + userExist.display_name,
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
                const mailBody = loginEmail(appName, 'Login Authentication', userExist.display_name, 'this is to notify you that your account has just been logged into successfully, If this is not you, contact support for immediate intervention, thank you.')
                const TextBody = loginText(userExist.display_name,);
                let mailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: userExist.email,
                    subject: 'Login notification!',
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

 // route to validate user token originality
 router.get("/authenticate_user", isAuth, async (req, res, next) => {
    //console.log('My ID ', req.params.id)
    //let myId = req.params.id;
    console.log("Good news ")
    res.send({ msg: '200',})
    }); 

   


module.exports = router;