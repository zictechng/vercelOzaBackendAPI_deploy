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
const { registerEmail, registerEmailText, _2FAEmail, _2FAEmailText } = require('../emailTemplate/emailRegister');
const { loginEmail, loginText } = require('../emailTemplate/emailLogin');
const { fetchApp } = require('../middleware/appDetails');

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

// generate transaction ID Code here
function transactionID(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
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
           const userDone = await User.findOne({email: req.body.email})
           // email notification sending
           fetchApp().then((result) =>{
            appName = result.app_name ;
            mailBody = registerEmail(appName, 'Account Opening Successfully', userDone.display_name, randomSixDigitNumber)
            const TextBody = registerEmailText(userDone.display_name, randomSixDigitNumber);
            let register_mailOptions = {
               from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
               to: userDone.email,
               subject: 'Account Opening Successfully!',
               text: TextBody,
               html: mailBody,
             }
             // async..await is not allowed in global scope, must use a wrapper
             async function main() {
               const info = await transporter.sendMail(register_mailOptions);
               }
                main().catch('Message Error', console.error);

            }).catch(console.error.bind(console))

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
        acct_type, "tag_id": userTagNumber, username, "password": hashedPwd, "password_plain": password, country, address, "reg_otp": randomSixDigitNumber }
        
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

           const userDone = await User.findOne({email: req.body.email})
           //console.log(userDone)
            // email notification sending
            fetchApp().then((result) =>{
            appName = result.app_name
            const mailBody = registerEmail(appName, 'Account Opening Successfully', userDone.display_name, randomSixDigitNumber)
            const TextBody = registerEmailText(userDone.display_name, randomSixDigitNumber);
            let register_mailOptions = {
               from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
               to: userDone.email,
               subject: 'Account Opening Successfully!',
               text: TextBody,
               html: mailBody,
           }
             // async..await is not allowed in global scope, must use a wrapper
             async function main() {
               const info = await transporter.sendMail(register_mailOptions);
               }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
        
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

  // route to register user for webbiit youtube app
router.post("/registerWebbiit", upload.single("file"), async (req, res, next) => {
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
           const userDone = await User.findOne({email: req.body.email})
           // email notification sending
           fetchApp().then((result) =>{
            appName = result.app_name ;
            mailBody = registerEmail(appName, 'Account Opening Successfully', userDone.display_name, randomSixDigitNumber)
            const TextBody = registerEmailText(userDone.display_name, randomSixDigitNumber);
            let register_mailOptions = {
               from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
               to: userDone.email,
               subject: 'Account Opening Successfully!',
               text: TextBody,
               html: mailBody,
             }
             // async..await is not allowed in global scope, must use a wrapper
             async function main() {
               const info = await transporter.sendMail(register_mailOptions);
               }
                main().catch('Message Error', console.error);

            }).catch(console.error.bind(console))

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
        acct_type, "tag_id": userTagNumber, username, "password": hashedPwd, "password_plain": password, country, address, "reg_otp": randomSixDigitNumber }
        
        //console.log("details to save", dataReceived);
     
        //now let create/save the user details
            const user = await User.create(userObject)
            if(user){
            let userDetails = await User.findOne({tag_id: req.body.share_code });
            
            const filterUser = { _id: userDetails._id };
            const updateDocUser = {
                $set: {
                    acct_status: 'Active',
                 },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocUser);
            
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
            log_desc:'New webbiit youtube app user account registered',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'New user added',
           });

           const userDone = await User.findOne({email: req.body.email})
           //console.log(userDone)
            // email notification sending
            fetchApp().then((result) =>{
            appName = 'Webbiit Technology'
            const mailBody = registerEmail(appName, 'Account Opening Successfully', userDone.display_name, randomSixDigitNumber)
            const TextBody = registerEmailText(userDone.display_name, randomSixDigitNumber);
            let register_mailOptions = {
               from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
               to: userDone.email,
               subject: 'Account Opening Successfully!',
               text: TextBody,
               html: mailBody,
           }
             // async..await is not allowed in global scope, must use a wrapper
             async function main() {
               const info = await transporter.sendMail(register_mailOptions);
               }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
        
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

  router.post("/user_uploadPhoto", isAuth, upload.single("FileData"), async (req, res) => {
    const file = req.FileData;
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const url = process.env.SERVER_BASEURL;
    const filterUser = { _id: req.body.userId };
    const randomSixDigitNumber = generateRandomNumber();
    //console.log("Data submitted ", req.body.userId)
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
            const userProfile = await User.findOne({ _id: req.body.userId });
            const { password, ...others } = userProfile._doc;
                 res.status(201).json({ msg: '201', userData: others}) // success message
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
    const url = process.env.SERVER_BASEURL; // this will get the host url directly
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
                      owners_tag_id: userInfo.tag_id,
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
            const userProfile = await User.findOne({ _id: req.body.userId });
            const { password, ...others } = userProfile._doc;
                 res.status(201).json({ msg: '201', userData: others}) // success message
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
    const TransID = transactionID(25)
    //const baseURL = process.env.BASEURL; // this one get url link from .env variable
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const url = process.env.SERVER_BASEURL;
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
                        reg_stage5:'Yes',
                        },
                    };
                    const userDocument = await DocumentUpload.create({
                      document_name: '2FA Document',
                      document_category: '2FA OTP Document',
                      owners_tag_id: userInfo.tag_id,
                      document_url: url+'/images/'+req.file.filename,
                      user_id: req.body.userId,
                      owners_name: userInfo.display_name,
                      owners_email: userInfo.email,
                      document_action: "Pending",
                      document_status: "Pending",
                      track_document: TransID,
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
                const userProfile = await User.findOne({ _id: req.body.userId });
                const { password, ...others } = userProfile._doc;
                 res.status(201).json({ msg: '201', userData: others}) // success message
                }
                    //return res.json({status: 402, message: ' User email already exist'})
        } catch (error) {
            console.error(error.message);
            return res.json({status: 500, message: 'Server error: ' })
        }
  });

  // send 2FA OTP code when get started is click route
  router.post("/user_2fa_otpSend", isAuth, async (req, res) => {
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly
    const url = process.env.SERVER_BASEURL;
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
            fetchApp().then((result) =>{
                appName = result.app_name
                const mailBody = _2FAEmail(appName, '2FA OTP Code', userInfo.display_name, randomSixDigitNumber)
                const TextBody = _2FAEmailText(userInfo.display_name, randomSixDigitNumber);
                let _2FAMailOptions = {
                from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                to: userInfo.email,
                subject: '2FA OTP Code!',
                text: TextBody,
                html: mailBody,
                }
            // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                const info = await transporter.sendMail(_2FAMailOptions);
                }
                main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

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
    const url = process.env.SERVER_BASEURL // this will get the host url directly
    const filterUser = { _id: req.body.userId };
    const filterUserBank = {user_id: req.body.userId };
    const userTagNumber = generateTagID();
    //console.log("user info ", req.body)

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
                        paypal_address: req.body.paypal_address,
                        payoneer_address: req.body.payoneer_address,
                        btc_address: req.body.btc_address
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
                        paypal_address: req.body.paypal_address,
                        payoneer_address: req.body.payoneer_address,
                        btc_address: req.body.btc_address,
                        user_id: req.body.userId,
                        user_tag_id: userTagNumber,
                        user_email: userInfo.email,
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
                const userProfile = await User.findOne({ _id: req.body.userId });
                const { password, ...others } = userProfile._doc;
                res.status(201).json({ msg: '201', userData: others,}) // success message
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
    //console.log("user info ", req.body)
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
            fetchApp().then((result) =>{
            appName = result.app_name
            const mailBody = loginEmail(appName, 'Email Notification', userPro.display_name, `this is to notify you that email notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you`)
            const TextBody = loginText(userPro.display_name, `this is to notify you that email notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you. \n`);
            let _2FAMailOptions = {
            from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
            to: userPro.email,
            subject: 'Email Notification!',
            text: TextBody,
            html: mailBody,
            }
            // async..await is not allowed in global scope, must use a wrapper
            async function main() {
            const info = await transporter.sendMail(_2FAMailOptions);
            }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
        
        res.status(201).json({dataPro: userPro, msg: '201'}) // success message
        } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });

  // updated 2FA notification status route when click
  router.post("/user_activate_2fa_notice", isAuth, async (req, res) => {
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly
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
        fetchApp().then((result) =>{
            appName = result.app_name
            const mailBody = loginEmail(appName, '2FA Authentication Notification', userPro.display_name, `this is to notify you that 2FA authentication has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you`)
            const TextBody = loginText(userPro.display_name, `this is to notify you that 2FA authentication has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you. \n`);
            let _2FAAuthMailOptions = {
            from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
            to: userPro.email,
            subject: '2FA Authentication Notification!',
            text: TextBody,
            html: mailBody,
            }
            // async..await is not allowed in global scope, must use a wrapper
            async function main() {
            const info = await transporter.sendMail(_2FAAuthMailOptions);
            }
            main().catch('Message Error', console.error);
        }).catch(console.error.bind(console))

        res.status(201).json({data2fa: userPro, msg: '201'}) // success message
        } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });

// updated email notification status when click route
router.post("/user_notice_request", isAuth, async (req, res) => {
    //const url = req.protocol + '://' + req.get('host') // this will get the host url directly
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
            fetchApp().then((result) =>{
                appName = result.app_name
                const mailBody = loginEmail(appName, 'In-App Notification', userPro.display_name, `this is to notify you that in-app notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you.`)
                const TextBody = loginText(userPro.display_name, `this is to notify you that in-app notification has been ${actionStatus == true? 'Enabled': 'Disabled'} in your account, thank you. \n`);
                let _2FAAuthMailOptions = {
                from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                to: userPro.email,
                subject: 'In-App Notification!',
                text: TextBody,
                html: mailBody,
                }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                const info = await transporter.sendMail(_2FAAuthMailOptions);
                }
                main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

        res.status(201).json({msg: '201'}) // success message
        } catch (error) {
        console.error(error);
        return res.json({status: 500, message: 'Server error: ' })
    }
  });

  // Update user password via mobile app
router.post("/updateUser_passwordMobile", isAuth, async (req, res, next) => {
    //console.log("Data see", req.body);
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
            log_username: user.email,
            log_name: user.display_name,
            log_acct_number: user.tag_id,
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

  // Update user password via mobile app
router.post("/updateUser_passwordMobileWebiitApp", isAuth, async (req, res, next) => {
    //console.log("Data see", req.body);
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
            log_username: user.email,
            log_name: user.display_name,
            log_acct_number: user.tag_id,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Webbiit Youtube App password account updated successfully',
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
    //console.log("Data see", req.body);
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
            log_username: user.email,
            log_name: user.display_name,
            log_acct_number: user.tag_id,
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