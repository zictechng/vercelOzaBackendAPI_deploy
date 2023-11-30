const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const fs = require("fs")

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const multer = require("multer");
const User = require('../models/User');
const SystemActivity = require('../models/SystemActivityLogs');
const userBankDetails = require('../models/UserBankDetails');
const UserReferral = require('../models/referralUser');
const nodemailer = require("nodemailer");

const transporter = require('../controllers/mailSender');
const { isAuth } = require('../middleware/auth');
const DocumentUpload = require('../models/DocumentUpload');

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
 var upload = multer({
    storage: storage,
    limits: {
      //fileSize: 1000000
      fileSize: 1024 * 1024 * 5
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
      }
    }
  });

  // middleware function to check image size before uploading
  const multerErrorHandling = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.log(err.message);
        return res.json({status: 400, message: ' File too big, reduce the size'})
        } else {
        next();
    }
};

//var upload = multer({ storage: storage });

 //npm install image-size --save
//  Then can get dimensions like this:

// var sizeOf = require('image-size');
// var dimensions = sizeOf('./sample.jpg');
// console.log(dimensions.width, dimensions.height);

// this function verify if the token user sent is valid
function verifyToken(req, res, next) {
    if (!req.headers.authorization){
      //return res.status(401).send({msg: '401'})
      return res.json({status: 401, message: 'Access denied'});
    }
    let token = req.headers.authorization.split(' ')[1];
    if(token === null || token === ''){
        return res.json({status: 401, message: 'Access denied'});
        //return res.status(401).send({msg: '401'})
    }
    let payload = jwt.verify(token, process.env.SECRET_LOGIN_KEY);
    if(!payload){
  
      console.log('Token Not verify respond ', res);
      return res.json({status: 401, message: 'Access denied'});
      //return res.status(401).send({msg: '401'});
    }
    req.userId = payload.subject
    next();
  }
    
// generate registration OTP Code here
    function generateRandomNumber() {
    return Math.floor(100000 + Math.random() * 900000);
    }

// generate user Tag ID for fund transfer here
function generateTagID() {
    return Math.floor(1000000 + Math.random() * 9000000);
    }

        const userTagNumber = generateTagID();
        //console.log(randomSixDigitNumber);

// route to register user and upload profile image
router.post("/register", upload.single("file"), async (req, res, next) => {
    const file = req.file;
    const imageUrl = '';
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly

    //const filter = { _id: req.body.display_name };
    const randomSixDigitNumber = generateRandomNumber();
    //console.log("Data submitted ", req.body)
    
    const dataReceived = {display_name: req.body.display_name, share_code: req.body.share_code,
    gender: req.body.gender, dob: req.body.dob, email: req.body.email, username: req.body.username,
    password: req.body.password, phone: req.body.phone, state: req.body.state, city: req.body.city,
    currency_type: req.body.currency_type, acct_type: req.body.acct_type, country: req.body.country,
    address: req.body.address };
    
    //get the object values of the request properties received
    const {display_name, gender,
        dob, email, username, password, phone, state, city, currency_type,
        acct_type, country, address, image_photo} = req.body
       
    // if(!username || !password || !surname || !first_name || !gender || !dob || !email || !address ){
    //     return res.status(400).json({msg: '400'}) // all fields are required
    // }
     if(!dataReceived.display_name ){
        return res.json({status: 404, message: ' All fields are required'})
        //return res.status(400).json({msg: '400'}) // all fields are required
    }
      try {
    // Check if user already exist
    const userExist = await User.findOne({email}).lean().exec()
    if(userExist){
        return res.json({status: 409, message: ' User email already exist'})
        //return res.status(409).json({msg: '409'}) // user already exist
    }
    // Check if phone already exist
    const userPhoneExist = await User.findOne({phone}).lean().exec()
    if(userPhoneExist){
        return res.json({status: 403, message: ' User email already exist'})
        //return res.status(409).json({msg: '409'}) // user already exist
    }
    // if user upload image file run this code
    if(file){
        const imageUrl = "/images/" + file.filename;
    // hash the password here
     const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    
     // now we can destruction the variable
     const userObject = { display_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, username, "password": hashedPwd, "password_plain": password, country, address, "image_photo": imageUrl, "reg_otp": randomSixDigitNumber }
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
                 // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.email,
            log_name: user.display_name,
            log_acct_number: user.tag_id,
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
                                Hello ${user.display_name}, this is to notify you that your account has been opened successfully, your account officer will contact you shortly for more details, thank you.
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
     const userObject = { display_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, username, "password": hashedPwd, "password_plain": password, country, address, "reg_otp": randomSixDigitNumber }
        
        //console.log("details to save", dataReceived);
     
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
            let userDetails = await User.findOne({tag_id: req.body.share_code });
             // create referral here
             if(userDetails){
                const createReferral = await UserReferral.create({
                    ref_mainEmail: userDetails.email,
                    ref_mainTag: userDetails.tag_id,
                    ref_userEmail: req.body.email,
                    ref_userName: req.body.display_name,
                    ref_status: 'Pending',
                    createdBy: userDetails._id
                   });
             }
           

           // create log here
           const addLogs = await SystemActivity.create({
            log_username: user.username,
            log_name: user.display_name,
            log_acct_number: user.tag_id,
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
  
  // this for deleting users photos in the database and folder
// router.post('/deletePhoto', (req, res) => {
//     console.log(req.body._id);
//     const userDetails = User.findByIdAndRemove(req.body._id, (err, data) =>{
//         console.log(data);
//         fs.unlinkSync(`./images/${data.image}`)
//     });
//     res.json({success: true});
// })

  // route to upload/update profile image


//   const pathToFile = "your-file.png"

// fs.unlink(pathToFile, function(err) {
//   if (err) {
//     throw err
//   } else {
//     console.log("Successfully deleted the file.")
//   }
// })

// const pathToFile = "your-file.png"

// try {
//   fs.unlinkSync(pathToFile)
//   console.log("Successfully deleted the file.")
// } catch(err) {
//   throw err
// }

// router.post("/userPost", isAuth, (req, res) => {
    
//         // }
//         console.log("authenticated ")
//         res.send("Welcome to private routes!")
      
//   });

  router.post("/user_uploadPhoto", isAuth, upload.single("FileData"), multerErrorHandling, async (req, res) => {
    const file = req.FileData;
    //const baseURL = process.env.BASEURL; // this one get url link from .env variable
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.userId };
    const randomSixDigitNumber = generateRandomNumber();
    console.log("Data submitted ", req.body.userId)
    // console.log("File name ", req.file.filename);
    // console.log("File size ", req.file.size);
    // console.log("Image size ", fileSizeBytes);
    // console.log("File Limit ", req.file.fieldSize)
    //console.log("Full URL ", url)
    //console.log("user info ", req.body.userId)
    
        try {
            const userInfo = await User.findOne({_id:req.body.userId}).lean().exec()
             
                if(!userInfo){
                    fs.unlinkSync(`public/images/${req.file.filename}`)
                    return res.json({status: 402, message: 'You need to login to do this'})
                } 
                if(userInfo){
                    const updateDoc = {
                        $set: {
                        reg_stage3:'Yes',
                        profile_photo: url+'/images/'+req.file.filename, 
                        },
                    };
                const updateUserNow = await User.updateOne(filterUser, updateDoc);
                    
                if(updateUserNow){
                    // create log here
                        const addLogs = await SystemActivity.create({
                        log_username: userInfo.email,
                        log_name: userInfo.display_name,
                        log_acct_number: userInfo?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'User update profile photo',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'Photo uploaded',
                        })
                     }
                 res.status(201).json({ msg: '201'}) // success message
                }
                    //return res.json({status: 402, message: ' User email already exist'})
        } catch (error) {
            console.error(error);
            return res.json({status: 500, message: 'Server error: ' })
        }
  });

  // upload user document verifications route
  router.post("/user_uploadDocument", isAuth, upload.single("documentData"), multerErrorHandling, async (req, res) => {
    const file = req.documentData;
    //const baseURL = process.env.BASEURL; // this one get url link from .env variable
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.userId };
    
        try {
            const userInfo = await User.findOne({_id:req.body.userId}).lean().exec()
             
                if(!userInfo){
                    fs.unlinkSync(`public/images/${req.file.filename}`)
                    return res.json({status: 402, message: 'You need to login to do this'})
                } 
                if(userInfo){
                    const updateDoc = {
                        $set: {
                        reg_stage4:'Yes',
                        },
                    };
                    const userDocument = await DocumentUpload.create({
                      document_name: req.body.document_name,
                      document_category: 'Document',
                      document_url: url+'/images/'+req.file.filename,
                      user_id: req.body.userId,
                      document_action: "Pending",
                      document_status: "Pending",
                    })
                const updateUserNow = await User.updateOne(filterUser, updateDoc);
                    
                if(userDocument){
                    // create log here
                        const addLogs = await SystemActivity.create({
                        log_username: userInfo.email,
                        log_name: userInfo.display_name,
                        log_acct_number: userInfo?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'User upload document',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'Document uploaded',
                        })
                     }
                 res.status(201).json({ msg: '201'}) // success message
                }
                    //return res.json({status: 402, message: ' User email already exist'})
        } catch (error) {
            console.error(error);
            return res.json({status: 500, message: 'Server error: ' })
        }
  });

  // upload user document verifications route
  router.post("/user_upload2fa", isAuth, upload.single("document2FA"), multerErrorHandling, async (req, res) => {
    const file = req.documentData;
    //const baseURL = process.env.BASEURL; // this one get url link from .env variable
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.userId };

    console.log("Full URL ", url)
    console.log("File image ", req.file.filename)
    console.log("user info ", req.body.userId)
    
        try {
            const userInfo = await User.findOne({_id:req.body.userId}).lean().exec()
             
                if(!userInfo){
                    fs.unlinkSync(`public/images/${req.file.filename}`)
                    return res.json({status: 402, message: 'You need to login to do this'})
                } 
                if(userInfo){
                    const updateDoc = {
                        $set: {
                        reg_stage5:'Yes',
                        },
                    };
                    const userDocument = await DocumentUpload.create({
                      document_name: '2FA Document',
                      document_category: '2FA OTP Document',
                      document_url: url+'/images/'+req.file.filename,
                      user_id: req.body.userId,
                      document_action: "Pending",
                      document_status: "Pending",
                    })
                const updateUserNow = await User.updateOne(filterUser, updateDoc);
                    
                if(userDocument){
                    // create log here
                        const addLogs = await SystemActivity.create({
                        log_username: userInfo.email,
                        log_name: userInfo.display_name,
                        log_acct_number: userInfo?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'User upload 2FA document',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'2FA Document uploaded',
                        })
                     }
                 res.status(201).json({ msg: '201'}) // success message
                }
                    //return res.json({status: 402, message: ' User email already exist'})
        } catch (error) {
            console.error(error.message);
            return res.json({status: 500, message: 'Server error: ' })
        }
  });
  

  // send 2FA OTP code when get started is click route
  router.post("/user_2fa_otpSend", isAuth, async (req, res) => {
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.userId };
    const randomSixDigitNumber = generateRandomNumber();
    //console.log("user info ", req.body)
         try {
            const userInfo = await User.findOne({_id:req.body.userId}).lean().exec()
              if(!userInfo){
                 return res.json({status: 402, message: 'NO user found'})
                } 
                if(userInfo){
                    const updateDoc = {
                        $set: {
                        verify2fa_code: randomSixDigitNumber
                        },
                    };
                    
                const updateUserNow = await User.updateOne(filterUser, updateDoc);
                    
                if(updateUserNow){
                    // create log here
                        const addLogs = await SystemActivity.create({
                        log_username: userInfo.email,
                        log_name: userInfo.display_name,
                        log_acct_number: userInfo?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'User 2FA code send for account verification',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'2FA code send',
                        })
                     }

        // email notification sending
           
          async function main() {
            // send mail with defined transport object
            const info = await transporter .sendMail({
                from: '"Mappido" <noreply@rugipoalumni.zictech-ng.com>', // sender address
              to: userInfo.email, // list of receivers
              subject: '2FA OTP Code',
            text: `Hello ${userInfo.display_name}, this is to notify you that your 2FA OTP code has be sent thank you. \n
                2FA OTP Code ${randomSixDigitNumber}, Use this code and write in on a white clean paper boldly and take a selfie with it and upload via the mobile app.`,
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
                                Hello ${userInfo.display_name}, this is to notify you that your 2FA OTP code has arrival, thank you.
                                </p>
                            </td>
                        </tr>
                        <tr>
                              <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                              <h3 style="font-size: 30px; font-weight: 800; line-height: 36px; color: #333333; margin: 0;">
                              2FA OTP Code ${randomSixDigitNumber}
                            </h3>
                              <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                  Use this code to verify your account! Write this code in a white clean paper boldly and take a selfie with it and then upload it via the mobile app.
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
        }
                    //return res.json({status: 402, message: ' User email already exist'})
    } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });

  // Complete user registration routes goes here
  router.post("/complete_registration", isAuth, async (req, res) => {
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.userId };
    const filterUserBank = {user_id: req.body.userId };
    const userTagNumber = generateTagID();
    console.log("user info ", req.body)

         try {
            const userInfo = await User.findOne({_id:req.body.userId}).lean().exec()
            // check if user has already created/added bank details before
            const oldBankDetails = await userBankDetails.findOne({user_id:req.body.userId}).lean().exec()
              if(!userInfo){
                 return res.json({status: 402, message: 'NO user found'})
                } 
                if(userInfo){
                    const updateDoc = {
                        $set: {
                        reg_stage2: "Yes",
                        gender: req.body.sex,
                        dob: req.body.dob,
                        state: req.body.state,
                        country: req.body.country,
                        acct_type:'Virtual',
                        address: req.body.address,
                        tag_id: userTagNumber,
                        currency_type: '$',
                        },
                    };
                    
                const updateUserNow = await User.updateOne(filterUser, updateDoc);
                // if previous banks details, update old ones
                if(oldBankDetails){
                    const updateBankDoc = {
                        $set: {
                        bank_name: req.body.bank_name,
                        bank_acct_name: req.body.acct_name,
                        bank_acct_number: req.body.acct_number,
                        },
                    };
                const updateUserBank = await User.updateOne(filterUserBank, updateBankDoc);
                }
                // if no previous bank details, create new one
                if(!oldBankDetails){
                    // create bank details here
                    const addBankInfo = await userBankDetails.create({
                        bank_name: req.body.bank_name,
                        bank_acct_name: req.body.acct_name,
                        bank_acct_number: req.body.acct_number,
                        user_id: req.body.userId,
                        bank_action: 'Pending',
                        bank_status: 'Pending',
                        })
                }
                if(updateUserNow){

                    // create log here
                        const addLogs = await SystemActivity.create({
                        log_username: userInfo.email,
                        log_name: userInfo.display_name,
                        log_acct_number: userInfo?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'User added profile details stage two',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'Profile details updated',
                        })
                     }
                    
                res.status(201).json({ msg: '201'}) // success message
            }
                    //return res.json({status: 402, message: ' User email already exist'})
    } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });


  // updated email notification status route when click
  router.post("/user_activate_email", isAuth, async (req, res) => {
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.user_Id };
    const actionStatus = req.body.status_value;
    console.log("user info ", req.body)
         try {
            const userPro = await User.findOne({_id:req.body.user_Id}).lean().exec()
              if(!userPro){
                 return res.json({status: 402, message: 'NO user found'})
                }
                // update email notifications to true
                const updateDocUserYes = {
                    $set: {
                    receive_email_notification: req.body.status_value
                    },
                };
               if(userPro){
                    const updateUserNow = await User.updateOne(filterUser, updateDocUserYes);
                // create log here
                    const addLogs = await SystemActivity.create({
                        log_username: userPro.email,
                        log_name: userPro.display_name,
                        log_acct_number: userPro?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'Updated email notification status',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'Email notification updated',
                        })
                }
                
            // send email notification to user
                async function main() {
                    // send mail with defined transport object
                    const info = await transporter .sendMail({
                        from: '"Mappido" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                        to: userPro.email, // list of receivers
                        subject: 'Email Notification',
                    text: `Hello ${userPro.display_name}, this is to notify you that email notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you. \n`,
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
                                            Hello ${userPro.display_name}, this is to notify you that email notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you
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
                    
            res.status(201).json({dataPro: userPro, msg: '201'}) // success message
        } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });

  // updated 2FA notification status route when click
  router.post("/user_activate_2fa_notice", isAuth, async (req, res) => {
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.user_Id };
    const actionStatus = req.body.status_value;
   
         try {
            const userPro = await User.findOne({_id:req.body.user_Id}).lean().exec()
              if(!userPro){
                 return res.json({status: 402, message: 'NO user found'})
                }
                // update email notifications to true
                const updateDocUserYes = {
                    $set: {
                    activate_2fa_login: req.body.status_value
                    },
                };
               if(userPro){
                    const updateUserNow = await User.updateOne(filterUser, updateDocUserYes);
                // create log here
                    const addLogs = await SystemActivity.create({
                        log_username: userPro.email,
                        log_name: userPro.display_name,
                        log_acct_number: userPro?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'Updated email notification status',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'Email notification updated',
                        })
                }
        // send email notification to user
                async function main() {
                    // send mail with defined transport object
                    const info = await transporter .sendMail({
                        from: '"Mappido" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                        to: userPro.email, // list of receivers
                        subject: '2FA Authentication Notification',
                    text: `Hello ${userPro.display_name}, this is to notify you that 2FA authentication has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you. \n`,
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
                                            Hello ${userPro.display_name}, this is to notify you that 2FA authentication has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you
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
                     
        res.status(201).json({data2fa: userPro, msg: '201'}) // success message
        } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });

// updated email notification status when click route
router.post("/user_notice_request", isAuth, async (req, res) => {
    const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const filterUser = { _id: req.body.user_Id };
    const actionStatus = req.body.status_value;
         try {
            const userPro = await User.findOne({_id:req.body.user_Id}).lean().exec()
              if(!userPro){
                 return res.json({status: 402, message: 'NO user found'})
                }
                // update email notifications to true
                const updateDocUserYes = {
                    $set: {
                    receive_app_message: req.body.status_value
                    },
                };
               if(userPro){
                    const updateUserNow = await User.updateOne(filterUser, updateDocUserYes);
                // create log here
                    const addLogs = await SystemActivity.create({
                        log_username: userPro.email,
                        log_name: userPro.display_name,
                        log_acct_number: userPro?.tag_id,
                        log_receiver_name: '',
                        log_receiver_number: '',
                        log_receiver_bank: '',
                        log_country: '',
                        log_swift_code: '',
                        log_desc:'User updated In-App notification status',
                        log_amt: '',
                        log_status: 'Successful',
                        log_nature:'In-App notification updated',
                        })
                }
                // send email notification to user
                async function main() {
                    // send mail with defined transport object
                    const info = await transporter .sendMail({
                        from: '"Mappido" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                        to: userPro.email, // list of receivers
                        subject: 'In-App Notification',
                    text: `Hello ${userPro.display_name}, this is to notify you that in-app notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you. \n`,
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
                                            Hello ${userPro.display_name}, this is to notify you that in-app notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you
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
                    
        res.status(201).json({msg: '201'}) // success message
        } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
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
router.post("/updateUser_passwordMobile", isAuth, async (req, res, next) => {
    console.log("Data see", req.body);
    const filterUser = { _id: req.body.userId };
    try {
        const user = await User.findOne({ _id: req.body.userId})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const hashedPwd = await bcrypt.hash(req.body.password, 10) // salt rounds
            const updateDocUser = {
                $set: {
                password_plain: req.body.password,
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
           res.status(201).json({msg: '201'}) // success message
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

  // Update user account pin via mobile app
router.post("/updateUser_AccountPinMobile", isAuth, async (req, res, next) => {
    console.log("Data see", req.body);
    const filterUser = { _id: req.body.userId };
    try {
        const user = await User.findOne({ _id: req.body.userId})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const updateDocUser = {
                $set: {
                acct_cot_pin: req.body.pin,
                
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
            log_desc:'Account pin updated successfully',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Pin details updated',
           })
           res.status(201).json({msg: '201'}) // success message
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