const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const User = require('../models/User');
const SystemActivity = require('../models/SystemActivityLogs');
const UserLogs = require('../models/UserLogs')

const nodemailer = require("nodemailer");

const transporter = require('../controllers/mailSender');
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

// route to register user and upload profile image
router.post("/login", async (req, res, next) => {
    const file = req.file;
    const filter = req.body ;

            //console.log("Login Data ", req.body);

            //check in input fields is empty
            if(filter.username == '' || filter.password == ''){
                return res.json({status: 400, message: ' All fields are required'})
                //return res.status(400).json({msg: '400'}) //Fields required
            } 
            
            try {
            // Check if user exist
            const userExist = await User.findOne({username: filter.username})
            
            if(!userExist){
                //console.log('Wrong username entered!');
                 return res.json({status: 401, message: ' User not found'})
                 
                //return res.status(401).json({msg: '401'}) //No user found
            }
            if(userExist.acct_status != 'Active' || userExist.acct_status == ''){
                //console.log('Wrong username entered!');
                 return res.json({status: 402, message: ' Account not active'})
                 
                //return res.status(401).json({msg: '401'}) //No user found
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
                    let payload = { subject: userExist._id }; // subject is the key, User._id the value
                    let token = jwt.sign(payload, process.env.SECRET_LOGIN_KEY); // 'secretkey' can be anything of your choice and you can put it in .env file
                    const { password, ...others } = userExist._doc; // this will remove password from the details send to server.
                      // create log here
                const addLogs = SystemActivity.create({
                    log_username: userExist.username,
                    log_name: userExist.surname+' '+userExist.first_name,
                    log_acct_number: userExist.acct_number,
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
                    login_username: userExist.username,
                    login_name: userExist.surname + ' ' + userExist.first_name,
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
                  async function main() {
                    // send mail with defined transport object
                    const info = await transporter .sendMail({
                      from: '"Rugipo Alumni" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                      to: userExist.email, // list of receivers
                      subject: "Login Notification", // Subject line
                      text: `Hello ${userExist.first_name}, this is to notify you that your account has just been logged into successfully, If this is not you, contact support for immediate intervention, thank you.`,
                      html: `<!DOCTYPE html>
                        <html>
                        <head>
                        <title></title>
                        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                        <style type="text/css">
                        
                        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                        img { -ms-interpolation-mode: bicubic; }
                        
                        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
                        table { border-collapse: collapse !important; }
                        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
                        
                        
                        a[x-apple-data-detectors] {
                            color: inherit !important;
                            text-decoration: none !important;
                            font-size: inherit !important;
                            font-family: inherit !important;
                            font-weight: inherit !important;
                            line-height: inherit !important;
                        }
                        
                        @media screen and (max-width: 480px) {
                            .mobile-hide {
                                display: none !important;
                            }
                            .mobile-center {
                                text-align: center !important;
                            }
                        }
                        div[style*="margin: 16px 0;"] { margin: 0 !important; }
                        </style>
                        <body style="margin: 0 !important; padding: 0 !important; background-color: #eeeeee;" bgcolor="#eeeeee">
                        
                
                <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Open Sans, Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                For what reason would it be advisable for me to think about business content? That might be little bit risky to have crew member like them. 
                </div>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="center" style="background-color: #eeeeee;" bgcolor="#eeeeee">
                        
                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                            <tr>
                                <td align="center" valign="top" style="font-size:0; padding: 35px;" bgcolor="#F44336">
                               
                                <div style="display:inline-block; max-width:50%; min-width:100px; vertical-align:top; width:100%;">
                                    <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                        <tr>
                                            <td align="left" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 25px; font-weight: 700; line-height: 35px;" class="mobile-center">
                                                <h3 style="font-size: 25px; font-weight: 700; margin: 0; color: #ffffff;">Rugipo Alumni Finance</h3>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <div style="display:inline-block; max-width:50%; min-width:100px; vertical-align:top; width:100%;" class="mobile-hide">
                                    <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                        <tr>
                                            <td align="right" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; line-height: 48px;">
                                                <table cellspacing="0" cellpadding="0" border="0" align="right">
                                                    <tr>
                                                        <td style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400;">
                                                            <p style="font-size: 18px; font-weight: 400; margin: 0; color: #ffffff;"><a href="#" target="_blank" style="color: #ffffff; text-decoration: none;">
                                                            <img src="https://rugipofinance.onrender.com/images/RAF_LOGO.png" width="100" height="100"/> &nbsp;</a></p>
                                                        </td>
                                                        
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                              
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 35px 35px 20px 35px; background-color: #ffffff;" bgcolor="#ffffff">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                    <tr>
                                        <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 25px;">
                                        <img src="https://img.icons8.com/ios/50/null/appointment-reminders--v2.png" style="display: block; border: 0px;" /><br>
                                            <h4 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                                Account Login Notification
                                            </h4>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                            <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                            Hello ${userExist.first_name}, this is to notify you that your account has just been logged into successfully, If this is not you, contact support for immediate intervention, thank you.
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <tr>
                                        <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                            <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                               
                                            </p>
                                        </td>
                                    </tr>
                            <tr>
                                <td align="center" style=" padding: 35px; background-color: #ff7361;" bgcolor="#1b9ba3">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                    <tr>
                                        <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 25px;">
                                            <h5 style="font-size: 18px; font-weight: 600; line-height: 15px; color: #ffffff; margin: 0;">
                                               Please, contact support for any irregularity in your account.
                                            </h5>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 25px 0 15px 0;">
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="border-radius: 5px;" bgcolor="#66b3b7">
                                                      <a href="https://veeapps.co.in/en/" target="_blank" style="font-size: 18px; font-family: Open Sans, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #F44336; padding: 15px 30px; border: 1px solid #F44336; display: block;">Contact</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 35px; background-color: #ffffff;" bgcolor="#ffffff">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                    
                                    <tr>
                                        <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 24px; padding: 5px 0 10px 0;">
                                            <p style="font-size: 14px; font-weight: 600; line-height: 12px; color: #333333;">
                                                675 Parko Avenue<br>
                                                LA, CA 02232
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 24px;">
                                            <p style="font-size: 14px; font-weight: 400; line-height: 20px; color: #777777;">
                                                You have received this email because you are a Customer of Rugipo Alumni Finance<br>
                This email, its attachment and any rights attaching hereto are, unless the content clearly indicates otherwise are the property of Rugipo Alumni Finance. It is confidential, private and intended for the addressee only.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                </table>
                    
                </body>
                    </html>`,
                    });
                  }
                    main().catch('Message Error', console.error);
                    
                res.send({ msg: '200', token: token, userData: others})
            //res.json({status: 201, message: ' Login Successful'})
            //console.log('Environment data!', process.env.SECRET_KEY);
        }
    });
            } catch (err) {
            res.status(500).send({ msg: "500" });
          }
    });
    
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
// router.get("/verify_login", verifyToken, async (req, res) => {
//     let myToken = req.query.token;
//     let myId = req.query.user_id;
       
//     // console.log("User ID ", myId);
//     // console.log("User token ", myToken);

//         try {
//             const userData = await User.find({_id: myId });
//             const userLogs = await UserLogs.findOne({login_token: myToken });
//             //console.log("User log Details ", userLogs)
//         if(userLogs === null){
//             const addLogs = SystemActivity.create({
//                         log_username: '',
//                         log_name: '',
//                         log_acct_number: '',
//                         log_receiver_name: '',
//                         log_receiver_number: '',
//                         log_receiver_bank: '',
//                         log_country: '',
//                         log_swift_code: '',
//                         log_desc:'User try to bye-past login',
//                         log_amt: '',
//                         log_status: 'Failed',
//                         log_nature:'Login failed',
//                     });
//         res.status(404).json({ msg: '404' })
//         console.log("Result Details", userLogs);
//         }
//          else if(!userData || userData === undefined || userData === null) {
//                 const addLogs = SystemActivity.create({
//                 log_username: '',
//                 log_name: '',
//                 log_acct_number: '',
//                 log_receiver_name: '',
//                 log_receiver_number: '',
//                 log_receiver_bank: '',
//                 log_country: '',
//                 log_swift_code: '',
//                 log_desc:'User try to bye-past login',
//                 log_amt: '',
//                 log_status: 'Failed',
//                 log_nature:'Login failed',
//             });
//             res.status(404).json({ msg: '404' })
//             }
//             else if(userLogs){
//             //console.log("Result Details", result);
//             res.status(200).send({data: userData, msg: '200'});
//             }
//         } catch (err) {
//             res.status(500).json(err);
//             console.log("Error 500 ", err.message);
//         }
//     });

    // route to verify user account (OTP)
router.post("/otp_verify", async (req, res, next) => {
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
                    console.log("OTP not matched ");
                    return res.json({status: 404, message: ' Invalid otp code'})
                  }
                else if(matches){
                     // just update one row
                const updateUserNow = await User.updateOne(filterUser, updateActStatus);
                // create log here
                 const addLogs = SystemActivity.create({
                    log_username: userExist.username,
                    log_name: userExist.surname+' '+userExist.first_name,
                    log_acct_number: '',
                    log_receiver_name: '',
                    log_receiver_number: '',
                    log_receiver_bank: '',
                    log_country: '',
                    log_swift_code: '',
                    log_desc:'Account verified successfully',
                    log_amt: '',
                    log_status: 'Successful',
                    log_nature:'User verify account',
                    })
               
                    var transporter  = nodemailer.createTransport({
                        host: process.env.EMAIL_HOST,
                        port: 587,
                        auth: {
                          user: process.env.EMAIL_USER_KEY,
                          pass: process.env.EMAIL_API_PASSWORD
                        }
                      });
                      
                      // async..await is not allowed in global scope, must use a wrapper
                      async function main() {
                        // send mail with defined transport object
                        const info = await transporter .sendMail({
                          from: '"Rugipo Alumni Finance" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                          to: userExist.email, // list of receivers
                          subject: "Account verified", // Subject line
                          text: `Hello ${userExist.first_name}, this is to notify you that your account has been verified successfully, You can now be able to use your account, thank you.`,
                          html: `<!DOCTYPE html>
                            <html>
                            <head>
                            <title></title>
                            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                            <style type="text/css">
                            
                            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                            img { -ms-interpolation-mode: bicubic; }
                            
                            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
                            table { border-collapse: collapse !important; }
                            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
                            
                            
                            a[x-apple-data-detectors] {
                                color: inherit !important;
                                text-decoration: none !important;
                                font-size: inherit !important;
                                font-family: inherit !important;
                                font-weight: inherit !important;
                                line-height: inherit !important;
                            }
                            
                            @media screen and (max-width: 480px) {
                                .mobile-hide {
                                    display: none !important;
                                }
                                .mobile-center {
                                    text-align: center !important;
                                }
                            }
                            div[style*="margin: 16px 0;"] { margin: 0 !important; }
                            </style>
                            <body style="margin: 0 !important; padding: 0 !important; background-color: #eeeeee;" bgcolor="#eeeeee">
                            
                    
                    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Open Sans, Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                    For what reason would it be advisable for me to think about business content? That might be little bit risky to have crew member like them. 
                    </div>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="center" style="background-color: #eeeeee;" bgcolor="#eeeeee">
                            
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                <tr>
                                    <td align="center" valign="top" style="font-size:0; padding: 35px;" bgcolor="#F44336">
                                   
                                    <div style="display:inline-block; max-width:50%; min-width:100px; vertical-align:top; width:100%;">
                                        <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                            <tr>
                                                <td align="left" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 25px; font-weight: 700; line-height: 35px;" class="mobile-center">
                                                    <h3 style="font-size: 25px; font-weight: 700; margin: 0; color: #ffffff;">Rugipo Alumni Finance</h3>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <div style="display:inline-block; max-width:50%; min-width:100px; vertical-align:top; width:100%;" class="mobile-hide">
                                        <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                            <tr>
                                                <td align="right" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; line-height: 48px;">
                                                    <table cellspacing="0" cellpadding="0" border="0" align="right">
                                                        <tr>
                                                            <td style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400;">
                                                                <p style="font-size: 18px; font-weight: 400; margin: 0; color: #ffffff;"><a href="#" target="_blank" style="color: #ffffff; text-decoration: none;">
                                                                <img src="https://rugipofinance.onrender.com/images/RAF_LOGO.png" width="100" height="100"/> &nbsp;</a></p>
                                                            </td>
                                                            
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                  
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 35px 35px 20px 35px; background-color: #ffffff;" bgcolor="#ffffff">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                        <tr>
                                            <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 25px;">
                                            <img src="https://img.icons8.com/ios/50/null/appointment-reminders--v2.png" style="display: block; border: 0px;" /><br>
                                                <h4 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                                    Account Login Notification
                                                </h4>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                                Hello ${userExist.first_name}, this is to notify you that your account has been verified successfully, You can now be able to use your account, thank you.
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <tr>
                                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                                   
                                                </p>
                                            </td>
                                        </tr>
                                <tr>
                                    <td align="center" style=" padding: 35px; background-color: #ff7361;" bgcolor="#1b9ba3">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                        <tr>
                                            <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 25px;">
                                                <h5 style="font-size: 18px; font-weight: 600; line-height: 15px; color: #ffffff; margin: 0;">
                                                   Please, contact support for any irregularity in your account.
                                                </h5>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="padding: 25px 0 15px 0;">
                                                <table border="0" cellspacing="0" cellpadding="0">
                                                    <tr>
                                                        <td align="center" style="border-radius: 5px;" bgcolor="#66b3b7">
                                                          <a href="https://veeapps.co.in/en/" target="_blank" style="font-size: 18px; font-family: Open Sans, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #F44336; padding: 15px 30px; border: 1px solid #F44336; display: block;">Contact</a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 35px; background-color: #ffffff;" bgcolor="#ffffff">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                                        
                                        <tr>
                                            <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 24px; padding: 5px 0 10px 0;">
                                                <p style="font-size: 14px; font-weight: 600; line-height: 12px; color: #333333;">
                                                    675 Parko Avenue<br>
                                                    LA, CA 02232
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 24px;">
                                                <p style="font-size: 14px; font-weight: 400; line-height: 20px; color: #777777;">
                                                    You have received this email because you are a Customer of Rugipo Alumni Finance<br>
                    This email, its attachment and any rights attaching hereto are, unless the content clearly indicates otherwise are the property of Rugipo Alumni Finance. It is confidential, private and intended for the addressee only.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>
                            </table>
                            </td>
                        </tr>
                    </table>
                        
                    </body>
                        </html>`,
                        });
                       
                        }
                    main().catch('Message Error', console.error);
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

  module.exports = router;