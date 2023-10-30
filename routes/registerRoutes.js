const express = require('express')
const router = express.Router()

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const multer = require("multer");
const User = require('../models/User');
const SystemActivity = require('../models/SystemActivityLogs');

const nodemailer = require("nodemailer");

const transporter = require('../controllers/mailSender');

const uploadLocation = "public/images"; // this is the image store location in the project
const storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    callBack(null, uploadLocation);
  },
  filename: (req, file, callBack) => {
    var img_name = Date.now() + "." + file.mimetype.split("/")[1];
    callBack(null, img_name);
  },
});

// Multer Mime Type Validation
// this will validate the file before uploading in backend mode
//  var upload = multer({
//     storage: storage,
//     limits: {
//       fileSize: 1024 * 1024 * 5
//     },
//     fileFilter: (req, file, cb) => {
//       if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
//         cb(null, true);
//       } else {
//         cb(null, false);
//         return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
//       }
//     }
//   });

var upload = multer({ storage: storage });

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
        return Math.floor(1000 + Math.random() * 9000);
        }

        const randomSixDigitNumber = generateRandomNumber();
        //console.log(randomSixDigitNumber);

// route to register user and upload profile image
router.post("/register", upload.single("file"), async (req, res, next) => {
    const file = req.file;

    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly

    const filter = { _id: req.body.first_name };
    const randomSixDigitNumber = generateRandomNumber();
    //console.log("Data submitted ", req.body)
    
    const dataReceived = { surname: req.body.surname, first_name: req.body.first_name,
    gender: req.body.gender, dob: req.body.dob, email: req.body.email, username: req.body.username,
    password: req.body.password, phone: req.body.phone, state: req.body.state, city: req.body.city,
    currency_type: req.body.currency_type, acct_type: req.body.acct_type, country: req.body.country,
    address: req.body.address };
    
    //get the object values of the request properties received
    const {surname, first_name, gender, 
        dob, email, username, password, phone, state, city, currency_type,
        acct_type, country, address, image_photo} = req.body
       
    // if(!username || !password || !surname || !first_name || !gender || !dob || !email || !address ){
    //     return res.status(400).json({msg: '400'}) // all fields are required
    // }
     if(!first_name || !password ){
        return res.json({status: 404, message: ' All fields are required'})
        //return res.status(400).json({msg: '400'}) // all fields are required
    }
      try {
    // Check if user already exist
    const userExist = await User.findOne({username}).lean().exec()
    if(userExist){
        return res.json({status: 409, message: ' User already exist'})
        //return res.status(409).json({msg: '409'}) // user already exist
    }

    // if user upload image file run this code
    if(file){
        const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, username, "password": hashedPwd, "password_plain": password, country, address, "image_photo": imageUrl, "reg_otp": randomSixDigitNumber }
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
                 // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'New user account added',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'New user registration',
           });

           // email notification sending
           
          async function main() {
            // send mail with defined transport object
            const info = await transporter .sendMail({
                from: '"Rugipo Alumni" <noreply@rugipoalumni.zictech-ng.com>', // sender address
              to: email, // list of receivers
              subject: 'Account Opening Successfully',
            text: `Hello ${user.first_name}, this is to notify you that your has been opened successfully, your account officer will contact you shortly for further details, thank you. \n
                OTP Code ${randomSixDigitNumber}, Use this code to verify your account before you can be able to login.`,
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
                            <img src="https://img.icons8.com/ios/100/null/user-male-circle--v2.png" style="display: block; border: 0px;" /><br>
                                <h4 style="font-size: 30px; font-weight: 800; line-height: 36px; color: #333333; margin: 0;">
                                Account Opening Successful
                                </h4>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                Hello ${user.first_name}, this is to notify you that your account has been opened successfully, your account officer will contact you shortly for more details, thank you.
                                </p>
                            </td>
                        </tr>
                        <tr>
                              <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                              <h3 style="font-size: 30px; font-weight: 800; line-height: 36px; color: #333333; margin: 0;">
                              OTP Code ${randomSixDigitNumber}
                            </h3>
                              <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                  Use this code to verify your account before you can be able to login.
                                  </p>
                              </td>
                          </tr>
                        <tr>
                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    </td>
                </tr>
                
                <tr>
                    <td align="center" style=" padding: 35px; background-color: #ff7361;" bgcolor="#1b9ba3">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                        <tr>
                            <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 25px;">
                                <h5 style="font-size: 18px; font-weight: 600; line-height: 15px; color: #ffffff; margin: 0;">
                                    Contact support for more details.
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
                                <p style="font-size: 14px; font-weight: 800; line-height: 18px; color: #333333;">
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
            main().catch('Email Message Error', console.error);

             res.send(201).json({ msg: '201'}) // success message
            
              } else{
            //res.send(401).json({ msg: '401'}) 
            res.json({status: 401, msg: '401'}) // invalid user details
            }
    }
    // if user did upload image file, run this
    else if(!file){
       // const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, username, "password": hashedPwd, "password_plain": password, country, address, "reg_otp": randomSixDigitNumber }
        
        //console.log("details to save", dataReceived);
     
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
             // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'New user account registered',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'New user added',
           });

            // email notification sending
           
              async function main() {
                // send mail with defined transport object
                const info = await transporter .sendMail({
                    from: '"Rugipo Alumni" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                  to: email, // list of receivers
                  subject: 'Account Opening Successfully',
                text: `Hello ${user.first_name}, this is to notify you that your has been opened successfully, your account officer will contact you shortly for further details, thank you. \n
                    OTP Code ${randomSixDigitNumber}, Use this code to verify your account before you can be able to login.`,
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
                                <img src="https://img.icons8.com/ios/100/null/user-male-circle--v2.png" style="display: block; border: 0px;" /><br>
                                    <h4 style="font-size: 30px; font-weight: 800; line-height: 36px; color: #333333; margin: 0;">
                                    Account Opening Successful
                                    </h4>
                                </td>
                            </tr>
                            <tr>
                                <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                    <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                    Hello ${user.first_name}, this is to notify you that your account has been opened successfully, your account officer will contact you shortly for more details, thank you.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                  <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                  <h3 style="font-size: 30px; font-weight: 800; line-height: 36px; color: #333333; margin: 0;">
                                    OTP Code ${randomSixDigitNumber}
                                  </h3>
                                      <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                      Use this code to verify your account before you can be able to login.
                                      </p>
                                  </td>
                              </tr>
                            <tr>
                                <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                    <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style=" padding: 35px; background-color: #ff7361;" bgcolor="#1b9ba3">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                            <tr>
                                <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 25px;">
                                    <h5 style="font-size: 18px; font-weight: 600; line-height: 15px; color: #ffffff; margin: 0;">
                                        Contact support for more details.
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
                                    <p style="font-size: 14px; font-weight: 800; line-height: 18px; color: #333333;">
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
                main().catch('Email Message Error', console.error);

                res.status(201).json({ msg: '201'}) // success message
            
              } else{
            //res.send(401).json({ msg: '401'}) 
            res.json({status: 401, msg: '401'}) // invalid user details
            }
        }
       } catch (err) {
          //res.send(500).send({ msg: "500" });
          res.json({status: 500, msg: '500'})
        }
  });
  
  
  // Admin route to register new user and upload profile image
router.post("/add-user", verifyToken, upload.single("file"), async (req, res, next) => {
    const file = req.file;

    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly

    const filter = { _id: req.body.first_name };

    const dataReceived = { surname: req.body.surname, first_name: req.body.first_name,
    gender: req.body.gender, dob: req.body.dob, email: req.body.email, username: req.body.username,
    password: req.body.password, phone: req.body.phone, state: req.body.state, city: req.body.city,
    currency_type: req.body.currency_type, acct_type: req.body.acct_type, country: req.body.country,
    address: req.body.address, acct_pin: req.body.acct_pin, acct_cot: req.body.acct_cot,
    acct_imf_code: req.body.acct_imf_code, acct_tax_code: req.body.acct_tax_code,
    acct_number: req.body.acct_number };
    
    //get the object values of the request properties received
    const {surname, first_name, gender, 
        dob, email, username, password, phone, state, city, currency_type,
        acct_type, country, address, acct_pin, acct_cot, acct_imf_code,
        acct_tax_code, acct_number, image_photo} = req.body
       
    if(!username || !password || !surname || !first_name || !gender || !dob || !email || !address ){
        return res.json({status: 400, message: ' All fields are required'})
        //return res.status(400).json({msg: '400'}) // all fields are required
    }
      try {
    // Check if user already exist
    const userExist = await User.findOne({username}).lean().exec()
    if(userExist){
        return res.json({status: 409, message: ' User already exist'})
        //return res.status(409).json({msg: '409'}) // user already exist
    }

    // if user upload image file run this code
    if(file){
        const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, acct_number, acct_pin, acct_cot, acct_imf_code, acct_tax_code, username, "password": hashedPwd, "password_plain": password, country, address, "image_photo": imageUrl }
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
            
            // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Registered new user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Added new user',
           })
                res.status(201).json({ msg: '201'}) // success message
            } else{
            res.status(401).json({ msg: '401'})  // invalid user details
            }
    }
    // if user did upload image file, run this
    else if(!file){
       // const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, acct_number, acct_pin, acct_cot, acct_imf_code, acct_tax_code, username, "password": hashedPwd, "password_plain": password, country, address}
        
        //console.log("details to save", dataReceived);
     
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
            // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Registered new user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Added new user',
           })
                res.status(201).json({ msg: '201'}) // success message
            } else{
            res.status(401).json({ msg: '401'})  // invalid user details
            }
        }
       } catch (err) {
          res.status(500).send({ msg: "500" });
        }
  });
  
  // register new admin user and upload profile image
router.post("/register_admin_users", verifyToken, upload.single("file"), async (req, res, next) => {
    const file = req.file;

    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly

    const filter = { _id: req.body.first_name };

    const dataReceived = { surname: req.body.surname, first_name: req.body.first_name,
    gender: req.body.gender, email: req.body.email, username: req.body.username,
    password: req.body.password, phone: req.body.phone };
    
    //get the object values of the request properties received
    const {surname, first_name, gender, 
        email, username, password, phone, image_photo} = req.body
       
    if(!username || !password || !surname || !first_name ){
        return res.json({status: 400, message: ' ALl fields are required'})
        //return res.status(400).json({msg: '400'}) // all fields are required
    }
      try {
    // Check if user already exist
    const userExist = await User.findOne({username}).lean().exec()
    if(userExist){
        return res.json({status: 409, message: ' User already exist'})
        //return res.status(409).json({msg: '409'}) // user already exist
    }

    // if user upload image file run this code
    if(file){
        const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, email, phone, username, "password": hashedPwd, "password_plain": password, "user_role": "Admin", "image_photo": imageUrl }
        //now let create/save the user details
            const user = await User.create(userObject)
            // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Registered new admin account',
            log_amt: '',
            log_status: 'Successfully registered',
            log_nature:'Added new user',
           })
            if(user){
                res.status(201).json({ msg: '201'}) // success message
            } else{
            res.status(401).json({ msg: '401'})  // invalid user details
            }
    }
    // if user did upload image file, run this
    else if(!file){
       // const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, email, phone, username, "password": hashedPwd, "password_plain": password, "user_role": "Admin"}
        
        //console.log("details to save", dataReceived);
     
        //now let create/save the user details
            const user = await User.create(userObject)
            // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Registered new admin account',
            log_amt: '',
            log_status: 'Successfully registered',
            log_nature:'Added new user',
           })
            if(user){
                res.status(201).json({ msg: '201'}) // success message
            } else{
            res.status(401).json({ msg: '401'})  // invalid user details
            }
        }
       } catch (err) {
          res.status(500).send({ msg: "500" });
          console.log("Error Details", err);
        }
  });
  
  
  // Admin route to update user details
router.post("/update_user", upload.single("file"), async (req, res, next) => {
    const file = req.file;
    //console.log(file);
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly

    const filterUser = { _id: req.body._id };

    const dataReceived = { surname: req.body.surname, first_name: req.body.first_name,
    gender: req.body.gender, dob: req.body.dob, email: req.body.email, username: req.body.username,
    password: req.body.password, phone: req.body.phone, state: req.body.state, city: req.body.city,
    currency_type: req.body.currency_type, acct_type: req.body.acct_type, country: req.body.country,
    address: req.body.address, acct_pin: req.body.acct_pin, acct_cot: req.body.acct_cot,
    acct_imf_code: req.body.acct_imf_code, acct_tax_code: req.body.acct_tax_code,
    acct_number: req.body.acct_number, _id: req.body._id, acct_status: req.body.acct_status};
    
    //get the object values of the request properties received
    const {surname, first_name, gender, 
        dob, email, username, password, phone, state, city, currency_type,
        acct_type, country, address, acct_pin, acct_cot, acct_imf_code,
        acct_tax_code, acct_number, _id, acct_status, image_photo} = req.body
       
    if(!username || !surname || !first_name || !gender || !dob || !email || !address ){
       return res.json({status: 400, message: ' All fields are required'})
        //return res.status(400).json({msg: '400'}) // all fields are required
    }
      try {

    if(file){
        const imageUrl = "/images/" + file.filename;
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, acct_number, acct_pin, acct_cot, acct_imf_code, acct_tax_code, username, _id, acct_status, country, address, "image_photo": imageUrl }
        const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
        //now let create/save the user details
            const updateDocBalance = {
                $set: {
                surname:req.body.surname,
                first_name: req.body.first_name, 
                gender: req.body.gender, 
                dob: req.body.dob, 
                email: req.body.email, 
                phone: req.body.phone, 
                state: req.body.state, 
                city: req.body.city, 
                currency_type: req.body.currency_type,
                acct_type: req.body.acct_type, 
                acct_number: req.body.acct_number, 
                acct_pin: req.body.acct_pin, 
                acct_cot: req.body.acct_cot, 
                acct_imf_code: req.body.acct_imf_code, 
                acct_tax_code: req.body.acct_tax_code, 
                username: req.body.username, 
                acct_status: req.body.acct_status,
                country: req.body.country, 
                address: req.body.address, 
                image_photo: imageUrl,
                password_plain: req.body.password,
                password: hashedPwd
                },
              };
            
        const updateUserNow = await User.updateOne(filterUser, updateDocBalance);
        // update user current balance here

            if(updateUserNow){
            // create log here
           const addLogs = await SystemActivity.create({
            log_username: req.body.username,
            log_name: req.body.surname+' '+req.body.first_name,
            log_acct_number: req.body.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Updated user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Update new user details',
           })
                res.status(201).json({ msg: '201'}) // success message
            console.log("Updated Details", updateUserNow.modifiedCount)
            } else{
            res.status(401).json({ msg: '401'})  // invalid user details
            }
    }
    // if user did upload image file, run this
    else if(!file){
     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, acct_number, acct_pin, acct_cot, acct_imf_code, acct_tax_code, username, _id, acct_status, country, address}
        const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
        const updateDocBalance = {
            $set: {
            surname:req.body.surname,
            first_name: req.body.first_name, 
            gender: req.body.gender, 
            dob: req.body.dob, 
            email: req.body.email, 
            phone: req.body.phone, 
            state: req.body.state, 
            city: req.body.city, 
            currency_type: req.body.currency_type,
            acct_type: req.body.acct_type, 
            acct_number: req.body.acct_number, 
            acct_pin: req.body.acct_pin, 
            acct_cot: req.body.acct_cot, 
            acct_imf_code: req.body.acct_imf_code, 
            acct_tax_code: req.body.acct_tax_code, 
            username: req.body.username, 
            acct_status: req.body.acct_status,
            country: req.body.country, 
            address: req.body.address,
            password_plain: req.body.password,
            password: hashedPwd 
            },
          };
    const updateUserNow = await User.updateOne(filterUser, updateDocBalance);
    // update user current balance here
        if(updateUserNow){
          // create log here
          const addLogs = await SystemActivity.create({
            log_username: req.body.username,
            log_name: req.body.surname+' '+req.body.first_name,
            log_acct_number: req.body.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Updated user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Update new user details',
           })
            res.status(201).json({ msg: '201'}) // success message
        console.log("Updated Details", updateUserNow.modifiedCount)

            } else{
            res.status(401).json({ msg: '401'})  // invalid user details
            }
        }
        
       } catch (err) {
          res.status(500).send({ msg: "500" });
          console.log("Error Message", err);
        }
  });

  // Update Admin user details
router.post("/update_admin_users", verifyToken, async (req, res, next) => {
    const file = req.file;
    //console.log("Data see", req.body);
    const filterUser = { _id: req.body.user_id };
    try {
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
           // console.log("User not found")
            return res.json({status: 404, message: ' All fields are required'})
            //return res.status(404).json({msg: '404'}) // all fields are required
        }
        else if(user){
            //console.log("User found");
            const hashedPwd = await bcrypt.hash(req.body.password, 10) // salt rounds

            const updateDocBalance = {
                $set: {
                surname:req.body.surname,
                first_name: req.body.first_name, 
                gender: req.body.gender, 
                email: req.body.email, 
                phone: req.body.phone, 
                username: req.body.username, 
                password_plain: req.body.password,
                password: hashedPwd 
                },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocBalance);
              // update user current balance here
            if(updateUserNow){
              // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Updated admin user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Update admin user details',
           })
                res.status(201).json({ msg: '201'}) // success message
            console.log("Updated Details", updateUserNow.modifiedCount)

                } else{
                res.status(401).json({ msg: '401'})  // invalid user details
                }
        }
        
    } catch (error) {
        res.status(500).send({ msg: "500" });
        console.log("Error Message", err);
    }

  });

  // Update user password details
router.post("/user_update_password", verifyToken, async (req, res, next) => {
    //console.log("Data see", req.body);
    const filterUser = { _id: req.body.user_id };
    try {
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
            //return res.status(404).json({msg: '404'}) // user not found required
        }
        else if(user){
            //console.log("User found");
            const hashedPwd = await bcrypt.hash(req.body.new_password, 10) // salt rounds
            const updateDocUser = {
                $set: {
                password_plain: req.body.new_password,
                password: hashedPwd 
                },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocUser);
              // update user current balance here
            if(updateUserNow){
              // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Password account updated successfully',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Password details updated',
           })
                res.status(201).json({ msg: '201'}) // success message
            //console.log("Updated Details", updateUserNow.modifiedCount)
                } else{
                res.status(401).json({ msg: '401'})  // invalid user details
                }
        }
        
    } catch (error) {
        res.status(500).send({ msg: "500" });
        console.log("Error Message", error);
    }

  });

  // Update user password via mobile app
router.post("/updateUser_passwordMobile", async (req, res, next) => {
    //console.log("Data see", req.body);
    const filterUser = { _id: req.body.uid };
    try {
        const user = await User.findOne({ _id: req.body.uid})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const hashedPwd = await bcrypt.hash(req.body.new_password, 10) // salt rounds
            const updateDocUser = {
                $set: {
                password_plain: req.body.new_password,
                password: hashedPwd 
                },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocUser);
              // update user current balance here
            if(updateUserNow){
              // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.surname+' '+user.first_name,
            log_acct_number: user.acct_number,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Password account updated successfully',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Password details updated',
           })
           res.send({ msg: '200'}) // success message
            //console.log("Updated Details", updateUserNow.modifiedCount)
                } else{
                res.status(401).json({ msg: '401'})  // invalid user details
                }
        }
        
    } catch (error) {
        res.status(500).send({ msg: "500" });
        console.log("Error Message", error);
    }

  });

  // forget password user request details
router.post("/verify_reset_password", async (req, res, next) => {
    //console.log("Data see", req.body);

    // var a = req.body.forget_details;
    // var b = parseInt(a);
    // console.log("Data Integer", b);

    if(req.body.forget_details == '' || req.body.forget_details == null) {
        return res.json({status: 400, message: ' Some fields are required'})
        //return res.status(400).json({msg: '400'}) // some fields are required
    }
    try {
        const user = await User.findOne({$or: [{email: req.body.forget_details},
                     {username: req.body.forget_details}]})
         if (!user){
            //console.log('Email user not found ');
            return res.json({status: 404, message: ' User not found'})
            //return res.status(404).json({msg: '404'})
          } 
         else if (user.acct_status != 'Active'){
            return res.json({status: 401, message: ' Account not active'})
           // return res.status(401).json({msg: '401'})
         }
         else if (user && user.acct_status == 'Active'){
        res.status(200).json({msg: '200', user})
         }
    } catch (error) {
        res.status(500).send({ msg: "500" });
        console.log("Error Message", error);
    }
  });

  module.exports = router;