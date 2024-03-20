const express = require('express');
const router = express.Router()
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const fs = require("fs")
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

const multer = require("multer");
const transporterMailer = require('../controllers/signupMailer');
const resendMailerTransport = require('../controllers/resendMailer');
const nodemailer = require("nodemailer");
const googleMailer = require('../controllers/gmailMailer');

const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');
const AppSetting = require('../models/AppSettingDetails')
const Ticket = require('../models/ticketData');
const UserLog = require('../models/UserLogs')
const UserSystemLog = require('../models/SystemActivityLogs')
const SystemActivity = require('../models/SystemActivityLogs');
const Notification = require('../models/NotificationAlert');
const CompanyDetails = require('../models/aboutUs')
const FundUserAccount = require('../models/fundAccount')
const GetRate = require('../models/businessRate')
const CompanyBank = require('../models/companyBankDetails')
const { isAuth } = require('../middleware/auth');
const DocumentUpload = require('../models/DocumentUpload');
const Referrals = require('../models/referralUser');
const moment = require('moment/moment');
const { getBeginningOfTheWeek } = require('../middleware/getStartDate');
const { fetchApp } = require('../middleware/appDetails');
const { loginEmail, loginText } = require('../emailTemplate/emailLogin');
const UserBankDetails = require('../models/UserBankDetails');
const TermCondition = require('../models/companyTermsCondition');
const { isNull } = require('lodash');
const { transactEmail } = require('../emailTemplate/emailRegister');

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

//var upload = multer({ storage: storage });
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

// cloudinary uploading configuration
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_ACCOUNT_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY 
});
    
// Use the uploaded file's name as the asset's public ID and 
    // allow overwriting the asset with new versions
    const ImageOptions = {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    };

// this function verify if the token user sent is valid
function verifyToken(req, res, next) {
  // console.log('Header request received ', req.headers.authorization)
  // console.log('Token Received here ', token_code);

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
// generate transaction ID Code here
  function generateRandomNumber() {
  return Math.floor(1000000 + Math.random() * 9000000);
  }

 var appName = '';

 
  // upload user document verifications route
router.post("/uploadApp_logo", upload.single("file"), multerErrorHandling, async (req, res) => {
  const file = req.logoFile;
  const url = process.env.SERVER_BASEURL; // this will get the host url directly
  //console.log(" files ", req.file)
  
  try {
    const logoDetails = await AppSetting.find()
    const ImagePath = `public/images/${req.file.filename}`
    
    const oldImage = logoDetails[0].app_logo;
    // this will separate the full path url
          if(oldImage){
            const newImagePath = oldImage.split( '/').slice(7)
            const path = `public/images/${newImagePath}`;

              if(oldImage && fs.existsSync(path)){
                fs.unlinkSync(`public/images/${newImagePath}`)
            } 
          }
          // Upload to cloudinary storage location
          const result = await cloudinary.uploader.upload(ImagePath, ImageOptions);
          //console.log(result);
          // get the uploaded image url location
          const imageUrl = result.secure_url
          if(logoDetails.length > 0 ){
            //fs.unlinkSync(`public/images/${req.file.filename}`)
            const updateDoc = {
                $set: {
                  app_logo: imageUrl != null || imageUrl != undefined ? imageUrl : '',
                },
              };
              const updateUserNow = await AppSetting.updateOne(updateDoc);
              if(updateUserNow.modifiedCount == 1) {
                const logoImage = await AppSetting.findOne()
                res.send({ msg: '201', message: ' Record updated successfully', info: logoImage.app_logo, infoData: logoImage,})
              }
              else if(updateUserNow.modifiedCount < 1) {
                return res.json({status: 500, message: 'No modifications occurred'})
              } 
            }

          else if(logoDetails.length < 1 ){
            const logoDocument = await AppSetting.create({
              app_logo: imageUrl != null || imageUrl != undefined ? imageUrl : '',
              })
              if (logoDocument?._id) {
                const logoImage = await AppSetting.findOne()

                res.send({ msg: "201", info: logoImage.app_logo, infoData: logoImage, message: " Record created successfully" });
                } else {
                return res.json({ status: 500, message: " Failed to create new record" });
                }
              }
           
          // create log here
              const addLogs = await SystemActivity.create({
              log_username: '',
              log_name: '',
              log_acct_number: '',
              log_receiver_name: '',
              log_receiver_number: '',
              log_receiver_bank: '',
              log_country: '',
              log_swift_code: '',
              log_desc:'Admin User upload logo',
              log_amt: '',
              log_status: 'Successful',
              log_nature:'Logo uploaded',
              })
              
      //return res.json({status: 402, message: ' User email already exist'})
      } catch (error) {
          console.error(error);
          return res.json({status: 500, message: 'Server error: ' })
      }
});

 // upload user document verifications route
 router.post("/uploadMain_logo", upload.single("file"), multerErrorHandling, async (req, res) => {
  const file = req.logoFile;
  const url = process.env.SERVER_BASEURL; // this will get the host url directly
  //console.log(" files ", req.file)
  const path = '';

  try {
    const logoDetails = await AppSetting.find()
    const ImagePath = `public/images/${req.file.filename}`
    
    const oldImage = logoDetails[0].app_main_logo;
    // this will separate the full path url
    
    if(oldImage){
      const newImagePath = oldImage.split( '/').slice(7)
      const path = `public/images/${newImagePath}`;

        if(oldImage && fs.existsSync(path)){
          fs.unlinkSync(`public/images/${newImagePath}`)
      } 
    }
      // Upload to cloudinary storage location
          const result = await cloudinary.uploader.upload(ImagePath, ImageOptions);
          //console.log(result);
          // get the uploaded image url location
          const imageUrl = result.secure_url
          if(logoDetails.length > 0 ){
            //fs.unlinkSync(`public/images/${req.file.filename}`)
            const updateDoc = {
                $set: {
                  app_main_logo: imageUrl != null || imageUrl != undefined ? imageUrl : '',
                },
              };
              const updateUserNow = await AppSetting.updateOne(updateDoc);
              if(updateUserNow.modifiedCount == 1) {
                const logoImage = await AppSetting.findOne()
                res.send({ msg: '201', message: ' Record updated successfully', info: logoImage.app_main_logo, infoData: logoImage,})
              }
              else if(updateUserNow.modifiedCount < 1) {
                return res.json({status: 500, message: 'No modifications occurred'})
              } 
            }

          else if(logoDetails.length < 1 ){
            const logoDocument = await AppSetting.create({
              app_main_logo: imageUrl != null || imageUrl != undefined ? imageUrl : '',
              })
              if (logoDocument?._id) {
                const logoImage = await AppSetting.findOne()

                res.send({ msg: "201", info: logoImage.app_main_logo, infoData: logoImage, message: " Record created successfully" });
                } else {
                return res.json({ status: 500, message: " Failed to create new record" });
                }
              }
           
          // create log here
              const addLogs = await SystemActivity.create({
              log_username: '',
              log_name: '',
              log_acct_number: '',
              log_receiver_name: '',
              log_receiver_number: '',
              log_receiver_bank: '',
              log_country: '',
              log_swift_code: '',
              log_desc:'Admin User upload logo',
              log_amt: '',
              log_status: 'Successful',
              log_nature:'Logo uploaded',
              })
              
      //return res.json({status: 402, message: ' User email already exist'})
      } catch (error) {
          console.error(error);
          return res.json({status: 500, message: 'Server error: ' })
      }
});

  // get dashboard first section static here..
router.get("/dashboard_salesReport", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("My ID", userId);
  const dateStart = moment().format('YYYY-MM-DD hh:mm:ss');
  const todayTime =  moment().startOf('day')
  const dateLast = moment().subtract(7,'d').format('YYYY-MM-DD hh:mm:ss');

  const startMonth = moment().startOf('month').format('YYYY-MM-DD hh:mm:ss');
  const endMonth = moment().endOf('month').format('YYYY-MM-DD hh:mm:ss');

  const startYear = moment().startOf('year').format('YYYY-MM-DD hh:mm:ss');
  const endYear = moment().endOf('year').format('YYYY-MM-DD hh:mm:ss');

  try {
       //console.log('Balance ', userWalletBalance)
      // daily sales total report
      let dailySales = 0;
      let payPalSales = 0;
      let payoneerSales = 0;
      let bitcoinSales = 0;
      const todaySales = await TransferFund.find(
        {
          transaction_status: 'Successful',
          currency_level:'2',
          creditOn: {$gte: todayTime}, 
        });
        
        dailySales = todaySales.reduce((sum, transaction) => sum + transaction.amount, 0);

        // Paypal sales report here...
        const allPaypalSales = await TransferFund.find(
          {
            transaction_status: 'Successful', transac_category:'PayPal'
            //creditOn: {$gte: todayTime}, 
          });
          
          payPalSales = allPaypalSales.reduce((sum, PayPalTransaction) => sum + PayPalTransaction.amount, 0);

          // Payoneer sales report here...
        const allPayoneerSales = await TransferFund.find(
          {
            transaction_status: 'Successful', transac_category:'Payoneer'
            //creditOn: {$gte: todayTime}, 
          });
          payoneerSales = allPayoneerSales.reduce((sum, allPayoneerTrans) => sum + allPayoneerTrans.amount, 0);

          // Bitcoin sales report here...
        const allBitcoinSales = await TransferFund.find(
          {
            transaction_status: 'Successful', transac_category:'Bitcoin'
            //creditOn: {$gte: todayTime}, 
          });
          bitcoinSales = allBitcoinSales.reduce((sum, allBitcoinTrans) => sum + allBitcoinTrans.amount, 0);

          // Bitcoin sales report here...
        const allAcctFund = await FundUserAccount.find(
          {
            fund_status: 'Approved',
          });
          userFund = allAcctFund.reduce((sum, allFundTran) => sum + allFundTran.amount, 0);

      res.send({ msg: '201', 
      feedback: dailySales, 
      feedPaypal: payPalSales, 
      feedPayoneer: payoneerSales, 
      feedBitcoin: bitcoinSales,
      feedAcctFund: userFund})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get dashboard second section ACCOUNT FUNDING static here..
router.get("/daily_fundingReport", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("My ID", userId);
  const todayTime =  moment().startOf('day')
  try {
    //get three current user funding details
     const currentFund = await FundUserAccount.find(
    {fund_status: 'Approved'}).sort({ createdOn: -1 }).limit(3);

  // daily funding total static report
  const dailyAcctFund = await FundUserAccount.find(
    {fund_status: 'Approved', creditOn: {$gte: todayTime}});
    todayFunding = dailyAcctFund.reduce((sum, allFundTran) => sum + allFundTran.amount, 0);

      res.send({ msg: '201', 
      feedAcctFund: todayFunding,
    feedCurrentFund: currentFund})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get dashboard second section USER static here..
router.get("/dashboard_userReport", isAuth, async (req, res) => {
  //console.log("My ID", userId);
  const todayTime =  moment().startOf('day')
  try {
    //get all user count details
     const allUsers = await User.find().count();
    
     //get all active user count details
     const activeUsers = await User.find().count({acct_status: "Active"});

     //get all pending user count details
     const pendingUsers = await User.find({acct_status: 'Pending'}).count();

     //get all suspended user count details
     const suspendedUsers = await User.find({acct_status: 'Suspended'}).count();

      res.send({ msg: '201', 
      feedAll: allUsers,
      feedActive: activeUsers,
      feedPending: pendingUsers,
      feedSuspended: suspendedUsers})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get dashboard last section USER RECENT TRANSACTION static here..
router.get("/user_recentReport", isAuth, async (req, res) => {
  try {
    //get all user count details
     const allRecentTran = await TransferFund.find().sort({ createdOn: -1 }).limit(10);
    
     //console.log('allRecentTran ', allRecentTran)
      res.send({ msg: '201', 
      feedAll: allRecentTran})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all active user list details here..
router.get("/activeUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Active'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allActive = await User.find({acct_status: 'Active'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    
      res.send({ msg: '201', 
      feedAll: allActive})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all pending user list details here..
router.get("/pendingUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;

  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Pending'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allPending = await User.find({acct_status: 'Pending'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    
      res.send({ msg: '201', feedAll: allPending, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all suspended user list details here..
router.get("/suspendUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Suspended'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allSuspended = await User.find({acct_status: 'Suspended'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    
      res.send({ msg: '201', feedAll: allSuspended, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all deleted user list details here..
router.get("/deletedUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Deleted'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allDeleted = await User.find({acct_status: 'Deleted'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    
      res.send({ msg: '201', feedAll: allDeleted, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user approved document list details here..
router.get("/approvedDocument_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await DocumentUpload.find({document_status: 'Approved'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allApprove = await DocumentUpload.find({document_status: 'Approved'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    //  const double = await DocumentUpload.aggregate([
    //   // {
    //   //   "$match": {
    //   //     "last_name": "Battson"
    //   //   }
    //   // },
    //   {
    //     "$lookup": {
    //       "from": "users",
    //       "localField": "users_id",
    //       "foreignField": "users._id",
    //       "as": "movie_docs"
    //     }
    //   }
    // ])

      res.send({ msg: '201', feedAll: allApprove, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user pending document list details here..
router.get("/pendingDocument_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await DocumentUpload.find({document_status: 'Pending'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allPendingDocument = await DocumentUpload.find({document_status: 'Pending'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    //  const double = await DocumentUpload.aggregate([
    //   // {
    //   //   "$match": {
    //   //     "last_name": "Battson"
    //   //   }
    //   // },
    //   {
    //     "$lookup": {
    //       "from": "users",
    //       "localField": "users_id",
    //       "foreignField": "users._id",
    //       "as": "movie_docs"
    //     }
    //   }
    // ])

      res.send({ msg: '201', feedAll: allPendingDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user pending document list details here..
router.get("/rejectedDocument_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await DocumentUpload.find({document_status: 'Rejected'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allRejectDocument = await DocumentUpload.find({document_status: 'Rejected'}).sort({ createdOn: -1 }).skip(skip).limit(limit);

      res.send({ msg: '201', feedAll: allRejectDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user banks list details here..
router.get("/userBank_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await UserBankDetails.find().count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allBankDocument = await UserBankDetails.find().sort({ createdOn: -1 }).skip(skip).limit(limit);

      res.send({ msg: '201', feedAll: allBankDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user account funding list details here..
router.get("/userAcctFunding_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 5;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await FundUserAccount.find().count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allFundDocument = await FundUserAccount.find().sort({ createdOn: -1 }).skip(skip).limit(limit);

      res.send({ msg: '201', feedAll: allFundDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user sales transaction list details here..
router.get("/userSales_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await TransferFund.find({tran_service_type:'Sales'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allSalesDocument = await TransferFund.find({tran_service_type:'Sales'}).sort({ creditOn: -1 }).skip(skip).limit(limit);

      res.send({ msg: '201', feedAll: allSalesDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all user buy services transaction list details here..
router.get("/userBuyOrder_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await TransferFund.find({tran_service_type:'Buy'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allBuyDocument = await TransferFund.find({tran_service_type: 'Buy'}).sort({ creditOn: -1 }).skip(skip).limit(limit);
      res.send({ msg: '201', feedAll: allBuyDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all transactions list details here..
router.get("/allUser_transaction", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await TransferFund.find().count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allTransDocument = await TransferFund.find().sort({ createdOn: -1 }).skip(skip).limit(limit);

      res.send({ msg: '201', feedAll: allTransDocument, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all support ticket message list details here..
// router.get("/allUser_messages", isAuth, async (req, res) => {
//   try {
//     //get all user count details
//      const allTickets = await Ticket.find().sort({ createdOn: -1 }).limit(5);
//    // console.log(allTickets)
//       res.send({ msg: '201', feedAll: allTickets})
//     } catch (err) {
//     res.status(500).json(err.message);
//     console.log(err.message);
//   }
// });

// router.get("/allUser_messages", isAuth, async (req, res) => {
//   try {
//   const allTickets = await Ticket.aggregate([
//   {
//   $lookup: {
//   from: 'users',
//   localField: 'createdBy',
//   foreignField: '_id',
//   as: 'userDetails'
//   }
//   },
//   {
//   $unwind: '$userDetails' // Unwind the array created by $lookup
//   },
//   {
//   $project: {
//   _id: 1, // Include the fields you need from the message collection
//   messageText: 1,
//   createdOn: 1,
//   'userDetails.mail': 1,
//   'userDetails.name': 1
//   }
//   },
//   {
//   $sort: { createdOn: -1 }
//   },
//   {
//   $limit: 5
//   }
//   ]);
//   console.log("All Message ", allTickets)

//   res.send({ msg: '201', feedAll: allTickets });
//   } catch (err) {
//   res.status(500).json(err.message);
//   console.error(err.message);
//   }
//   });

router.get('/allUser_messages', isAuth, async (req, res) => {
  try {
  const allTickets = await Ticket.aggregate([
      {
      $lookup: {
      from: 'users', // The name of the User collection
      localField: 'createdBy',
      foreignField: '_id',
      as: 'userDetails',},},
      {
      $sort: { createdOn: -1 },
      },
      {
      $limit: 20,
      },
      ]);

  //console.log(allTickets.userDetails);
  // Extract relevant information from the aggregation result
  const formattedTickets = allTickets.map((ticket) => ({
  _id: ticket._id,
  subject: ticket.subject,
  ticket_message: ticket.ticket_message,
  ticket_status: ticket.ticket_status,
  ticket_type: ticket.ticket_type,
  ticket_closed: ticket.ticket_closed,
  //"userDetails.display_name": 1
  user: ticket.userDetails[0], // Assuming there is only one user associated with a ticket
  }));
  
  //console.log("All Message ", formattedTickets)
  res.send({ msg: '201', feedAll: formattedTickets });
  } catch (err) {
  res.status(500).json({ error: err.message });
  console.error(err.message);
  }
  });

// get about the company content from database here..
router.get("/allAbout_us", isAuth, async (req, res) => {
  try {
    //get all user count details
     const aboutUs = await CompanyDetails.find();
     //console.log(aboutUs)
      res.send({ msg: '201', feedAll: aboutUs})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// update about the company information
router.post('/updateAbout_us', isAuth, async (req, res, next) =>{
  //
  try {
    console.log(req.body)
    // set deactivation status here ...
    const updateDoc = {
      $set: {
        company_name: req.body.company_name,
        company_regId: req.body.company_regId,
        company_desc: req.body.description,
        company_email: req.body.company_email
        },
    }
    const updateRead = await CompanyDetails.updateOne(updateDoc);

    res.send({ msg: '201'})
  } catch (error) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
 

})

// get about the company business rate from database here..
router.get("/service_rate", isAuth, async (req, res) => {
  try {
    //get all user count details
     const businessRate = await GetRate.find();
     //console.log(aboutUs)
      res.send({ msg: '201', feedAll: businessRate})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// update service rate information
router.post('/updateService_rate', isAuth, async (req, res, next) =>{
  //
  try {
    // set deactivation status here ...
    const updateDoc = {
      $set: {
        btc_selling: req.body.btc_selling,
        btc_buying: req.body.btc_buying,
        paypal_buying: req.body.paypal_buying,
        paypal_selling: req.body.paypal_selling,
        payoneer_buying: req.body.payoneer_buying,
        payoneer_selling: req.body.payoneer_selling,
        bonus_rate: req.body.referral_bonus_amt,
        signup_bonus_rate: req.body.signup_bonus,
        },
    }
    const updateRead = await GetRate.updateOne(updateDoc);
    console.log(updateRead)
    if(updateRead.modifiedCount > 0) {
      
      res.send({ msg: '201'})
    }
    else{
      return res.json({ status: 402, message: " Failed to update record" });
    }

  } catch (error) {
    res.status(500).json(err.message);
    console.log(err.message);
  }

})

// get the company terms and conditions from database here..
router.get("/terms_condition", isAuth, async (req, res) => {
  try {
    //get all user count details
     const termConditionData = await TermCondition.find();
    // console.log('termCondition ', termConditionData)
      res.send({ msg: '201', feedAll: termConditionData})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get the company terms and conditions from database here..
router.post("/update_termCondition", isAuth, async (req, res, next) => {
 // console.log('data status ', req.body)
  try {

    const checkData = await CompanyDetails.find();

        if (checkData.length < 1) {
        const addNew = await CompanyDetails.create({
        company_term_conditions: req.body.desc,
        term_status: req.body.termStatus
        //user_policy
        });
       
        if (addNew?._id) {
        res.send({ msg: "201", message: " Record created successfully" });
        } else {
        return res.json({ status: 500, message: " Failed to create new record" });
        }
        }
    else if(checkData.length > 0){
     // update the details
     const updateDoc = {
      $set: {
        company_term_conditions: req.body.desc,
        term_status: req.body.termStatus
          },
      }
      const updateRead = await CompanyDetails.updateOne(updateDoc);
      if(updateRead.modifiedCount == 1) {
          res.send({ msg: '201', message: ' Record updated successfully'})
        }
        else if(updateRead.modifiedCount == 0) {
          return res.json({status: 500, message: ' Record not updated'})
        } 
    }
    
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get the company user use policy from database here..
router.post("/update_userPolicy", isAuth, async (req, res, next) => {
  //console.log('data status ', req.body)
  try {

    const checkData = await CompanyDetails.find();

        if (checkData.length < 1) {
        const addNew = await CompanyDetails.create({
        company_privacy_policy: req.body.user_policyDesc,
        policy_status: req.body.policyStatus
        //user_policy
        });
       
        //console.log(' res ', addNew)
        if (addNew?._id) {
        res.send({ msg: "201", message: " Record created successfully" });
        } else {
        return res.json({ status: 500, message: " Failed to create new record" });
        }
        }
    else if(checkData.length > 0){
     // update the details
     const updateDoc = {
      $set: {
        company_privacy_policy: req.body.user_policyDesc,
        policy_status: req.body.policyStatus
          },
      }
      const updateRead = await CompanyDetails.updateOne(updateDoc);
      if(updateRead.modifiedCount == 1) {
          res.send({ msg: '201', message: ' Record updated successfully'})
        }
        else if(updateRead.modifiedCount == 0) {
          return res.json({status: 500, message: ' Record not updated'})
        } 
    }
    
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get the company app setting details from database here..
router.get("/app_setting", isAuth, async (req, res) => {
  try {
    //get all user count details
     const appDetails = await AppSetting.find();
    // console.log('termCondition ', termConditionData)
      res.send({ msg: '201', feedAll: appDetails})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get the company app setting details from database here..
router.get("/app_settingPage", async (req, res) => {
  try {
    //get all user count details
     const appDetails = await AppSetting.find();
    // console.log('termCondition ', termConditionData)
      res.send({ msg: '201', feedAll: appDetails})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get the company bank details from database here..
router.get("/fetchCompany_bank", isAuth, async (req, res) => {
  try {
    const bankDetails = await CompanyBank.find();
    // console.log('termCondition ', termConditionData)
      res.send({ msg: '201', feedAll: bankDetails})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// update the app name and short description in database here..
router.post("/update_appName", isAuth, async (req, res, next) => {
  try {

    const checkData = await AppSetting.find();

        if (checkData.length < 1) {
        const addNew = await AppSetting.create({
        app_short_name: req.body.appDesc,
        app_name: req.body.appName,
        app_version: req.body.appVersion
        //user_policy
        });
       
        console.log(' res ', addNew)
        if (addNew?._id) {
        res.send({ msg: "201", message: " Record created successfully" });
        } else {
        return res.json({ status: 500, message: " Failed to create new record" });
        }
        }
    else if(checkData.length > 0){
     // update the details
     const updateDoc = {
      $set: {
        app_short_name: req.body.appDesc,
        app_name: req.body.appName,
        app_version: req.body.appVersion
          },
      }
      const updateRead = await AppSetting.updateOne(updateDoc);
      if(updateRead.modifiedCount == 1) {
          res.send({ msg: '201', message: ' Record updated successfully'})
        }
        else if(updateRead.modifiedCount < 1) {
          return res.json({status: 500, message: 'No modifications occurred'})
        } 
    }
    
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// update the app status and services in database here..
router.post("/update_appStatus", isAuth, async (req, res, next) => {
  try {

    const checkData = await AppSetting.find();

        if (checkData.length < 1) {
        const addNew = await AppSetting.create({
        app_paypal_sale: req.body.paypalSale,
        app_payoneer_sale: req.body.payoneerSale,
        app_bitcoin_buy: req.body.bitcoinBuy,
        app_bitcoin_sale: req.body.bitcoinSale,
        app_payoneer_buy: req.body.payoneerBuy,
        app_paypal_buy: req.body.paypalBuy,
        app_state: req.body.appStatus,
        app_baseurl: req.body.baseUrl,
        app_paypayKey: req.body.payPayToken,
        app_minim_funding: req.body.mini_funding,
        app_maxi_funding: req.body.maxi_funding,
        app_payStack_btn: req.body.payStack_btn,
        app_paypal_bnt: req.body.paypal_btn,
        app_referral_bonus: req.body.referral_bonus_status,
        app_signup_bonus: req.body.signup_bonus_status,
        app_new_signup_status: req.body.newSignup_status,
        app_operation_status: req.body.appMode_status,
        app_stop_login_status: req.body.appLogin_status,
        app_mode_message: req.body.appMode_message,
        
        //user_policy
        });
       
        //console.log(' res ', addNew)
        if (addNew?._id) {
        res.send({ msg: "201", message: " Record created successfully" });
        } else {
        return res.json({ status: 500, message: " Failed to create new record" });
        }
        }
    else if(checkData.length > 0){
     // update the details
     const updateDoc = {
      $set: {
        app_paypal_sale: req.body.paypalSale,
        app_payoneer_sale: req.body.payoneerSale,
        app_bitcoin_buy: req.body.bitcoinBuy,
        app_bitcoin_sale: req.body.bitcoinSale,
        app_payoneer_buy: req.body.payoneerBuy,
        app_paypal_buy: req.body.paypalBuy,
        app_state: req.body.appStatus,
        app_baseurl: req.body.baseUrl,
        app_paypayKey: req.body.payPayToken,
        app_minim_funding: req.body.mini_funding,
        app_maxi_funding: req.body.maxi_funding,
        app_payStack_btn: req.body.payStack_btn,
        app_paypal_bnt: req.body.paypal_btn,
        app_referral_bonus: req.body.referral_bonus_status,
        app_signup_bonus: req.body.signup_bonus_status,
        app_new_signup_status: req.body.newSignup_status,
        app_operation_status: req.body.appMode_status,
        app_stop_login_status: req.body.appLogin_status,
        app_mode_message: req.body.appMode_message,
          },
      }
      const updateRead = await AppSetting.updateOne(updateDoc);
      if(updateRead.modifiedCount == 1) {
          res.send({ msg: '201', message: ' Record updated successfully'})
        }
        else if(updateRead.modifiedCount < 1) {
          return res.json({status: 500, message: 'No modifications occurred'})
        } 
    }
    
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// update the company bank details in database here..
router.post("/update_companyBankStatus", isAuth, async (req, res, next) => {
  try {

    const checkData = await CompanyBank.find();

        if (checkData.length < 1) {
        const addNew = await CompanyBank.create({
        company_bank1: req.body.zenith_bankName,
        company_acct_number1: req.body.zenith_number,
        company_acct_name1: req.body.zenith_acctName,
        company_bank2: req.body.fidelity_bankName,
        company_acct_number2: req.body.fidelityNumber,
        company_acct_name2: req.body.fidelityAcctName,
        company_desc: '',
        company_btc_address: req.body.bitcoin_address,
        company_paypal_address: req.body.paypal_address,
        company_payoneer_address: req.body.payoneer_address,
        company_momoAccount: req.body.momo_number,
        //user_policy
        });
       
        //console.log(' res ', addNew)
        if (addNew?._id) {
        res.send({ msg: "201", message: " Record created successfully" });
        } else {
        return res.json({ status: 500, message: " Failed to create new record" });
        }
        }
    else if(checkData.length > 0){
     // update the details
     const updateDoc = {
      $set: {
        company_bank1: req.body.zenith_bankName,
        company_acct_number1: req.body.zenith_number,
        company_acct_name1: req.body.zenith_acctName,
        company_bank2: req.body.fidelity_bankName,
        company_acct_number2: req.body.fidelityNumber,
        company_acct_name2: req.body.fidelityAcctName,
        company_desc: '',
        company_btc_address: req.body.bitcoin_address,
        company_paypal_address: req.body.paypal_address,
        company_payoneer_address: req.body.payoneer_address,
        company_momoAccount: req.body.momo_number,
          },
      }
      const updateRead = await CompanyBank.updateOne(updateDoc);
      if(updateRead.modifiedCount == 1) {
          res.send({ msg: '201', message: ' Record updated successfully'})
        }
        else if(updateRead.modifiedCount < 1) {
          return res.json({status: 500, message: 'No modifications occurred'})
        } 
    }
    
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// update the app landing page content in database here..
router.post("/update_landPage", isAuth, async (req, res, next) => {
  try {

    const checkLandData = await AppSetting.find();
        if (checkLandData.length < 1) {
        const addNew = await AppSetting.create({
        app_launch_title: req.body.appTitle,
        app_launch_desc: req.body.appDesc,
        });
       
        console.log(' res ', addNew)
        if (addNew?._id) {
        res.send({ msg: "201", message: " Record created successfully" });
        } else {
        return res.json({ status: 500, message: " Failed to create new record" });
        }
        }
    else if(checkLandData.length > 0){
     // update the details
     const updateDoc = {
      $set: {
        app_launch_title: req.body.appTitle,
        app_launch_desc: req.body.appDesc,
          },
      }
      const updateRead = await AppSetting.updateOne(updateDoc);
      if(updateRead.modifiedCount == 1) {
          res.send({ msg: '201', message: ' Record updated successfully'})
        }
        else if(updateRead.modifiedCount < 1) {
          return res.json({status: 500, message: 'No modifications occurred'})
        } 
    }
    
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all admin active user list details here..
router.get("/adminActiveUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Active', user_role: 'Admin'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allAdminActive = await User.find({acct_status: 'Active', user_role: 'Admin'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    
      res.send({ msg: '201', 
      feedAll: allAdminActive, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all admin pending user list details here..
router.get("/adminPendingUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Pending', user_role: 'Admin'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages
    //get all user count details
     const allAdminPending = await User.find({acct_status: 'Pending', user_role: 'Admin'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
    
      res.send({ msg: '201', 
      feedAll: allAdminPending, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all admin suspended user list details here..
router.get("/adminSuspendedUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Suspended', user_role: 'Admin'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages
    //get all user count details
     const allAdminSuspended = await User.find({acct_status: 'Suspended', user_role: 'Admin'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
      res.send({ msg: '201', 
      feedAll: allAdminSuspended, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all admin deleted user list details here..
router.get("/adminDeletedUser_details", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await User.find({acct_status: 'Deleted', user_role: 'Admin'}).count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const allAdminDeleted = await User.find({acct_status: 'Deleted', user_role: 'Admin'}).sort({ createdOn: -1 }).skip(skip).limit(limit);
      res.send({ msg: '201', 
      feedAll: allAdminDeleted, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user Details via ID passed here..
router.get("/adminGetUser_details/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  try {
    //get all user count details
     const userDetails = await User.findOne({_id: userId});
     const { password, password_plain, ...others } = userDetails._doc; // this will remove password from the details send to server.
      res.send({ msg: '201', 
      feedAll: others})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Update admin user password details here..
router.post("/adminUserPassword_update/", isAuth, async (req, res) => {
  const filterUser = { _id: req.body.user_id };
  //console.log(req.body);
    try {
        const user = await User.findOne({ _id: req.body.user_id})
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

// Update admin user password details here..
router.post("/user_accountAction/", isAuth, async (req, res) => {
  const filterUser = { _id: req.body.user_id };
  const actionStatus = req.body.action_status;
  
    try {
      if(req.body.user_id == '' || req.body.user_id == null){
        return res.json({status: 404, message: ' User ID not found'})
     }
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const updateDocUser = {
                $set: {
                acct_status: req.body.action_status,
                },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocUser);
              // update user current balance here
            if(updateUserNow){
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
            log_desc:'Admin user request action on user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User Account ',
           })
       // send email to the account owner
       const logoImage = '';

       fetchApp().then((result) => {
        appName = result.app_name
        appLogo = result.app_logo
        const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

        const mailBody = loginEmail(appName, actionStatus =='Active' ? 'Congratulations' :'Account Issue', user.display_name, ` ${actionStatus ==`Active` ? `this is to notify you that your account has been activated after been carefully reviewed.
        thank you for choosing ${appName} and we hope you will continue enjoy our services`: `this is to notify you that your account has been flashed with and issue. Kindly contact support for more details and possible resolution.
        Thank you` }, $logoImage`)
            const mailText = loginText(user.display_name, ` ${actionStatus ==`Active` ? `this is to notify you that your account has been activated after been carefully reviewed,
            thank you for choosing ${appName} and we hope you will continue enjoy our services`:`this is to notify you that your account has been flashed with and issue. Kindly contact support for more details and possible resolution.
            Thank you` }`)
            let account_issueEMail = {
              from: `${appName} <noreply@ozaapp.com>`,
              to: user.email,
              subject: 'Account Notification!',
              text: mailText,
              html: mailBody,
            }
            async function main() {
            const info = await transporterMailer.sendMail(account_issueEMail);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
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

// Update admin user password details here..
router.post("/user_accountStateAction/", isAuth, async (req, res) => {
  const filterUser = { _id: req.body.user_id };
  const actionStatus = req.body.action_status;
  
   try {
        if(req.body.user_id == '' || req.body.user_id == null){
          return res.json({status: 404, message: ' User ID not found'})
        }
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const updateDocUser = {
                $set: {
                  acct_active_status: req.body.action_status,
                },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocUser);
              // update user current balance here
            if(updateUserNow){
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
            log_desc:'Admin user request action on user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User Account ',
           })

           // send email to the account owner
           fetchApp().then((result) => {
            appName = result.app_name
            appLogo = result.app_logo
            const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

            const mailBody = loginEmail(appName, actionStatus =='Active' ? 'Congratulations' :'Account Issue', user.display_name, ` ${actionStatus ==`Active` ? `this is to notify you that your account has been activated after been carefully reviewed.
            thank you for choosing ${appName} and we hope you will continue enjoy our services`: `this is to notify you that your account has been flashed with and issue. Kindly contact support for more details and possible resolution.
            Thank you` }, $logoImage`)
                const mailText = loginText(user.display_name, ` ${actionStatus ==`Active` ? `this is to notify you that your account has been activated after been carefully reviewed,
                thank you for choosing ${appName} and we hope you will continue enjoy our services`:`this is to notify you that your account has been flashed with and issue. Kindly contact support for more details and possible resolution.
                Thank you` }`)
                let account_issueEMail = {
                  from: `${appName} <noreply@ozaapp.com>`,
                  to: user.email,
                  subject: 'Account Notification!',
                  text: mailText,
                  html: mailBody,
                }
                async function main() {
                const info = await transporterMailer.sendMail(account_issueEMail);
                    }
                main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))

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

// Update admin user password details here..
router.post("/user_ApproveAccountAction/", isAuth, async (req, res) => {
  const filterUser = { _id: req.body.user_id };
  const actionStatus = req.body.action_status;
    try {
          if(req.body.user_id == '' || req.body.user_id == null){
            return res.json({status: 404, message: ' User ID not found'})
          }
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const updateDocUser = {
                $set: {
                  acct_approved_status: req.body.action_status,
                },
              };
        const updateUserNow = await User.updateOne(filterUser, updateDocUser);
              // update user current balance here
            if(updateUserNow){
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
            log_desc:'Admin user request approval action on user account',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User Account ',
           })

           // send email to the account owner
           fetchApp().then((result) => {
            appName = result.app_name
            appLogo = result.app_logo
            const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

            const mailBody = loginEmail(appName, actionStatus =='Approved' ? 'Congratulations' :'Account Issue', user.display_name, ` ${actionStatus ==`Approved` ? `this is to notify you that your account has been fully approved after been carefully reviewed your documents,.
            thank you for choosing ${appName} and we hope you will enjoy our services`: `this is to notify you that your account has been flashed with and issue. Kindly contact support for more details and possible resolution.
            Thank you` }, $logoImage`)
                const mailText = loginText(user.display_name, ` ${actionStatus ==`Approved` ? `this is to notify you that your account has been fully approved after been carefully reviewed your documents,.
                thank you for choosing ${appName} and we hope you will enjoy our services`:`this is to notify you that your account has been flashed with and issue. Kindly contact support for more details and possible resolution.
                Thank you` }`)
                let account_issueEMail = {
                  from: `${appName +' Support'} <noreply@ozaapp.com>`,
                  to: user.email,
                  subject: 'Account Notification!',
                  text: mailText,
                  html: mailBody,
                }
                async function main() {
                const info = await transporterMailer.sendMail(account_issueEMail);
                    }
                main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))

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

// get user document via ID passed here..
router.get("/adminGetUser_document/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("MY ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
     const userDocument = await DocumentUpload.findOne({_id: userId} );
     if(userDocument){
      res.send({ msg: '201', feedAll: userDocument})
     }
     else{
      return res.json({status: 404, message: ' Document not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// User account document details here..
router.post("/adminApprove_document", isAuth, async (req, res) => {
  const filterUser = { _id: req.body.doc_id };
  const documentName = req.body.doc_name
  const documentType = req.body.doc_type

  console.log(req.body)

  const actionStatus = req.body.action_status;
    try {
          if(req.body.user_id == '' || req.body.user_id == null){
            return res.json({status: 404, message: ' User ID not found'})
          }
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
            const updateDocUser = {
                $set: {
                  document_status: req.body.action_status,
                  action_date: Date.now()
                },
              };
        const updateUserNow = await DocumentUpload.updateOne(filterUser, updateDocUser);
              // update user current balance here
            if(updateUserNow){
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
            log_desc:'Admin user perform action on user document',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User Document ',
           })

           // send email to the account owner
           fetchApp().then((result) => {
            appName = result.app_name
            appLogo = result.app_logo
            const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

            const mailBody = loginEmail(appName, actionStatus =='Approved' ? 'Congratulations' :'Document Issue', user.display_name, ` ${actionStatus ==`Approved` ? `this is to notify you that your ${documentName} document has been fully approved after been carefully reviewed the documents,
            thank you for choosing ${appName} and we hope you will enjoy our services`: `this is to notify you that your account document was not approved. Kindly contact support for more details and possible resolution.
            Thank you` }, $logoImage`)
                const mailText = loginText(user.display_name, ` ${actionStatus ==`Approved` ? `this is to notify you that your ${documentName} document has been fully approved after been carefully reviewed the documents,
                thank you for choosing ${appName} and we hope you will enjoy our services`:`this is to notify you that your account document was not approved. Kindly contact support for more details and possible resolution.
                Thank you` }`)
                let account_issueEMail = {
                  from: `${appName +' Support'} <noreply@ozaapp.com>`,
                  to: user.email,
                  subject: 'Account Document Notification!',
                  text: mailText,
                  html: mailBody,
                }
                async function main() {
                const info = await transporterMailer.sendMail(account_issueEMail);
                    }
                main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))

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

// Reject User account document submitted here..
router.post("/adminRejected_documentUpload", isAuth, async (req, res) => {
  const filterUser = { _id: req.body.doc_id };
  const filterUserId = { _id: req.body.user_id };
  const documentName = req.body.doc_name
  const documentType = req.body.doc_type
  const documentReason = req.body.reasons

  console.log(req.body)

  const actionStatus = req.body.action_status;
    try {
          if(req.body.user_id == '' || req.body.user_id == null){
            return res.json({status: 404, message: ' User ID not found'})
          }
        const user = await User.findOne({ _id: req.body.user_id})
        if(!user){
            return res.json({status: 404, message: ' User not found'})
         }
        else if(user){
          // update the document status
            const updateDocUser = {
                $set: {
                  document_status: req.body.action_status,
                  reject_document_reason: req.body.reasons,
                  action_date: Date.now()
                },
              };
        const updateUserNow = await DocumentUpload.updateOne(filterUser, updateDocUser);

        // update the user registration account document status
        if(req.body.doc_name =='Document'){
          const updateUserAcct = {
            $set: {
              reg_stage4: "",
            },
          };
          const updateUser = await User.updateOne(filterUserId, updateUserAcct);
        }
        if(req.body.doc_name !='Document'){
          const updateUserAcct = {
            $set: {
              reg_stage5: "",
            },
          };
          const updateUser = await User.updateOne(filterUserId, updateUserAcct);
        }
              // update user current balance here
            if(updateUserNow){
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
            log_desc:'Admin user perform action on user document',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'User Document Rejected ',
           })

           // send email to the account owner
           fetchApp().then((result) => {
            appName = result.app_name
            appLogo = result.app_logo
            const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

            const mailBody = loginEmail(appName, 'Document Issue', user.display_name, `this is to notify you that your ${documentName} has been rejected after been carefully reviewed the documents, Reason: ${documentReason} 
            you can contact support for more details and possible resolution, Thank you`, logoImage)
                const mailText = loginText(user.display_name, `this is to notify you that your ${documentName} has been rejected after been carefully reviewed the documents, Reason: ${documentReason} 
                you can contact support for more details and possible resolution, Thank you`)
                let account_issueEMail = {
                  from: `${appName +' Support'} <noreply@ozaapp.com>`,
                  to: user.email,
                  subject: 'Account Document Notification!',
                  text: mailText,
                  html: mailBody,
                }
                async function main() {
                const info = await transporterMailer.sendMail(account_issueEMail);
                    }
                main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))

        // check if user enabled in-app notifications and send notification
              if(user.receive_app_message == true) {
                const userLogs = Notification.create({
                alert_username: user.display_name,
                alert_name: user.display_name,
                alert_user_ip: '',
                alert_country: '',
                alert_browser: '',
                alert_date:  Date.now(),
                alert_user_id: user._id,
                alert_nature: documentName +' Issues \n Reason: ' + documentReason,
                alert_status: 1,
                alert_read_date: ''
                })
              }

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

// get user funding details via ID passed from funding table here..
router.get("/getAcctFunding_details/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("MY ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
     const userFund = await FundUserAccount.findOne({_id: userId} );
     if(userFund){
      res.send({ msg: '201', feedAll: userFund})
     }
     else{
      return res.json({status: 404, message: ' Records not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Approved user funding account details here..
router.post("/approveAcctFunding", isAuth, async (req, res) => {
  let userId = req.body.tran_id;
  //console.log("MY ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
     const userFund = await FundUserAccount.findOne({_id: userId} );
     const userDetail = await User.findOne({tag_id: userFund.fund_tag_id} );
     
     const allTran = await TransferFund.findOne({tid: userFund.fund_number} );
     
     if(!userDetail){
      return res.json({status: 404, message: ' User record not found'})
     }
     if(!userFund){
      return res.json({status: 404, message: ' Transaction not valid'})
     }

     const currentBal = userDetail.amount+ +userFund.amount

     if(userDetail){
      const filterUser = { _id: userDetail._id };
      const filterTransaction = { _id: req.body.tran_id };
      const filterGeneral = { _id: allTran._id}

      const updateUserFundStatus = {
        $set: {
          fund_status: 'Approved',
        },
      };

      const updateUserAcctBal = {
        $set: {
          amount: currentBal,
        },
      };

      // update general transaction status here
      const updateGeneralStatus = {
        $set: {
          transaction_status: "Successful",
          approved_date:  Date.now(),
        },
      };

      const updateUserBal = await User.updateOne(filterUser, updateUserAcctBal);
      const updateFundStatus = await FundUserAccount.updateOne(filterTransaction, updateUserFundStatus);
      const updateGeneral = await TransferFund.updateOne(filterGeneral, updateGeneralStatus);

      const addLogs = await SystemActivity.create({
        log_username: '',
        log_name: userDetail.display_name,
        log_acct_number: userDetail.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Admin staff approved user account funding request',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Funding Approved',
       })

       // check if user enabled in-app notifications and send notification
      if(userDetail.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: userDetail.display_name,
        alert_name: userDetail.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetail._id,
        alert_nature: `Account Funding\nThis is to notify you that your account funding has been approved and your wallet has be credited with the sum of \u20A6${new Intl.NumberFormat().format(userFund.amount)}.\nWith transaction ID: ${userFund.fund_number}`,
        alert_status: 1,
        alert_read_date: ''
        })
      }

      // send email to the account owner
      fetchApp().then((result) => {
        appName = result.app_name
        appLogo = result.app_logo
        const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
        const mailBody = loginEmail(appName, 'Fund Approved', userDetail.display_name, `this is to notify you that your account funding has been approved and your wallet has be credited with the sum of 
        <b>\u20A6${new Intl.NumberFormat().format(userFund.amount)}</b> <br>
        with transaction ID <b>${userFund.fund_number}</b><br>
        thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)
            const mailText = loginText(userDetail.display_name, `this is to notify you that your account funding has been approved and your wallet has be credited with the sum of \n\n
            <b>\u20A6${new Intl.NumberFormat().format(userFund.amount)}</b><br>
             
            with transaction ID <b>${userFund.fund_number}</b><br>
            thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
            let account_issueEMail = {
              from: `${appName +' Sales'} <noreply@mailbox.ozaapp.com>`,
              to: userDetail.email,
              subject: 'Account Funding Notification!',
              text: mailText,
              html: mailBody,
            }
            async function main() {
            const info = await resendMailerTransport.sendMail(account_issueEMail);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

        res.status(201).json({msg: '201'}) // success message
     }
     else{
      return res.json({status: 404, message: ' Error occurred, try again'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Rejected user funding account details here..
router.post("/rejectApproveAcctFunding", isAuth, async (req, res) => {
  let userId = req.body.tran_id;
  //console.log("MY ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
     const userFund = await FundUserAccount.findOne({_id: userId} );
     const userDetail = await User.findOne({tag_id: userFund.fund_tag_id} );
     
     const allTran = await TransferFund.findOne({tid: userFund.fund_number} );

     if(!userDetail){
      return res.json({status: 404, message: ' User record not found'})
     }
     if(!userFund){
      return res.json({status: 404, message: ' Transaction not valid'})
     }

     const currentBal = userDetail.amount+ +userFund.amount
     const filterTransaction = { _id: req.body.tran_id };
     const filterGeneral = { _id: allTran._id}

     if(userDetail){

      const updateUserFundStatus = {
        $set: {
          fund_status: 'Rejected',
        },
      };

      // update general transaction status here
      const updateGeneralStatus = {
        $set: {
          transaction_status: "Rejected",
          approved_date:  Date.now(),
        },
      };

      const updateFundStatus = await FundUserAccount.updateOne(filterTransaction, updateUserFundStatus);
      // check if user enabled in-app notifications and send notification
      const updateGeneral = await TransferFund.updateOne(filterGeneral, updateGeneralStatus);

      if(userDetail.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: userDetail.display_name,
        alert_name: userDetail.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetail._id,
        alert_nature: `Account Funding Issues\nReason: We are unable to verify that the transaction with transaction ID: ${userFund.fund_number} was valid or successful!\nPlease, you can contact support for more details and possible resolutions` ,
        alert_status: 1,
        alert_read_date: ''
        })
      }
      const addLogs = await SystemActivity.create({
        log_username: '',
        log_name: userDetail.display_name,
        log_acct_number: userDetail.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Admin staff rejected user account funding request',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Funding Rejected ',
       })
      // send email to the account owner
      fetchApp().then((result) => {
        appName = result.app_name
        appLogo = result.app_logo
        const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

        const mailBody = loginEmail(appName, 'Account Funding Issue', userDetail.display_name, `this is to notify you that your account funding request has been rejected or cancelled after been review your transaction details.
        <br> Amount Funding: <b>\u20A6${new Intl.NumberFormat().format(userFund.amount)}</b> <br>
        With transaction ID <b>${userFund.fund_number}</b><br> 
        We are unable to verify that the transaction was valid and successful! Please you can contact support for more details and possible resolutions.<br><br>
        Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)

            const mailText = loginText(userDetail.display_name, `this is to notify you that your account funding request has been rejected or cancelled after been review your transaction details.
            <br> Amount Funding: <b>\u20A6${new Intl.NumberFormat().format(userFund.amount)}</b> <br>
            With transaction ID <b>${userFund.fund_number}</b><br> 
            We are unable to verify that the transaction was valid and successful! Please you can contact support for more details and possible resolutions.<br><br>
            Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
            let account_issueEMail = {
              from: `${appName +' Support'} <noreply@ozaapp.com>`,
              to: userDetail.email,
              subject: 'Account Funding Notification!',
              text: mailText,
              html: mailBody,
            }
            async function main() {
            const info = await transporterMailer.sendMail(account_issueEMail);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

        res.status(201).json({msg: '201'}) // success message
     }
     else{
      return res.json({status: 404, message: ' Error occurred, try again'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user sales details via ID passed from funding table here..
router.get("/getSales_details/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("MY ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
     const userSales = await TransferFund.findOne({_id: userId} );
     if(userSales){
      res.send({ msg: '201', feedAll: userSales})
     }
     else{
      return res.json({status: 404, message: ' Records not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

var newAmtBonus = null;
// Approved user sales funds and credit their bank account details here..
router.post("/approveFundSales", isAuth, async (req, res) => {
  let recordId = req.body.tran_id;

  let bonusMoney // this will make this variable global and accessible anywhere in this block
  //console.log("MY ID ", userId);
  try {
    if(recordId == '' || recordId == null){
      return res.json({status: 404, message: ' Record ID not found'})
    }
    //get all user count details
    const allSales = await TransferFund.findOne({_id: recordId} );
     
     const userDetail = await User.findOne({tag_id: allSales.acct_number} );
     
     if(!userDetail){
      return res.json({status: 404, message: ' User record not found'})
     }
     if(!allSales){
      return res.json({status: 404, message: ' Transaction not valid'})
     }

      //process user referral bonus details here
    const checkReferral = await Referrals.findOne({ref_userEmail: userDetail.email, ref_status:'Pending' });
    
    //check if referral is valid and award the user the credit amount
    if(checkReferral && checkReferral.ref_status == 'Pending' && checkReferral.ref_state == true ){
      // get referral user details
        const checkUser = await User.findOne({email: checkReferral.ref_mainEmail });
          // get exchange rate details
          const checkTradeRate = await GetRate.findOne();

          let addAmount = parseInt(checkTradeRate.bonus_rate) * parseInt(checkTradeRate.paypal_buying);
          
          const InitialBal = checkUser.amount+ +addAmount

          const filterUser = { _id: checkUser._id };
          const filterReferral = { _id: checkReferral._id };
    
          const updateReferralStatus = {
          $set: {
            ref_status: 'Approved',
            ref_approvedDate: Date.now()
            },
          };

        const updateUserBalance = {
          $set: {
            amount: InitialBal,
          },
        };

        const updateUserBal = await User.updateOne(filterUser, updateUserBalance);
        const updateRef = await Referrals.updateOne(filterReferral, updateReferralStatus);
      
        // process notifications in different levels
        const addLogs = await SystemActivity.create({
          log_username: '',
          log_name: checkUser.display_name,
          log_acct_number: checkUser.tag_id,
          log_receiver_name: '',
          log_receiver_number: '',
          log_receiver_bank: '',
          log_country: '',
          log_swift_code: '',
          log_desc:'User referral bonus approved and credited',
          log_amt: '',
          log_status: 'Successful',
          log_nature:'Bonus fund Approved',
         })
  
         // check if user enabled in-app notifications and send notification
        if(checkUser.receive_app_message == true) {
          const userLogs = Notification.create({
          alert_username: checkUser.email,
          alert_name: checkUser.display_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: checkUser._id,
          alert_nature: `Referral Bonus Approved \n Note: this is to notify you that your referral bonus funds has been approved and your account has been credited with the sum of \u20A6${new Intl.NumberFormat().format(addAmount)}\n for your hard work by sharing your referral ID.\n Keep referring to keep earning...`,
          alert_status: 1,
          alert_read_date: ''
          })
        }
  
        // send email to the account owner
        if(checkUser.receive_email_notification == true){
          fetchApp().then((result) => {
            appName = result.app_name
            appLogo = result.app_logo
            const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

            const mailBody = loginEmail(appName, 'Fund Sales Approved', checkUser.display_name, `this is to notify you that your referral bonus funds has been approved and your account has be credited with the sum of \n\n
            <b>\u20A6${new Intl.NumberFormat().format(addAmount)}</b> for your hard work for sharing your referral Tag ID <br>
            </b><br>  Keep it up and keep referring your friends, loves one to continue earning... <br>
            Thank you for choosing ${appName}, we hope you continue to enjoy our awesome services.`, logoImage)
            
          const mailText = loginText(checkUser.display_name, `this is to notify you that your referral bonus funds has been approved and your account has be credited with the sum of \n\n
          <b>\u20A6${new Intl.NumberFormat().format(addAmount)}</b> for your hard work for sharing your referral Tag ID <br>
          </b><br>  Keep it up and keep referring your friends, loves one to continue earning... <br>
          Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
          let account_issueEMail = {
            from: `${appName +' Sales'} <noreply@ozaapp.com>`,
            to: checkUser.email,
            subject: 'Funds Credit Notification!',
            text: mailText,
            html: mailBody,
          }
          async function main() {
          const info = await transporterMailer.sendMail(account_issueEMail);
              }
          main().catch('Message Error', console.error);
          }).catch(console.error.bind(console))
          }
      }

     const currentBal = userDetail.tran_account+ +allSales.amount
     // check for user signup bonus amount
     const filterUser = { _id: userDetail._id };
     if(userDetail.signup_account > 0){
      
      bonusMoney = userDetail.signup_account * allSales.tran_rate;
      const updateUserBonus = {
        $set: {
          signup_account: 0,
          },
        };
        const updateUserBalBonus = await User.updateOne(filterUser, updateUserBonus);
      }

     const totalSales = allSales.amount * allSales.tran_rate
    let gTotal = bonusMoney+ + totalSales;

    console.log("Total Sales: " + gTotal);
    console.log("Total Bonus: " + bonusMoney);
     // credit approval request account here
     if(userDetail){
      const filterUser = { _id: userDetail._id };
      const filterGeneral = { _id: allSales._id}
      // update user balance
      const updateUserAcctBal = {
        $set: {
          tran_account: currentBal,
        },
      };

      // update general transaction status here
      const updateGeneralStatus = {
        $set: {
          transaction_status: "Successful",
          approved_date:  Date.now(),
        },
      };

      const updateUserBal = await User.updateOne(filterUser, updateUserAcctBal);
      const updateGeneral = await TransferFund.updateOne(filterGeneral, updateGeneralStatus);

      const addLogs = await SystemActivity.create({
        log_username: '',
        log_name: userDetail.display_name,
        log_acct_number: userDetail.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Admin staff approved user funds sale request',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Sale fund Approved',
       })

       // check if user enabled in-app notifications and send notification
      if(userDetail.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: userDetail.display_name,
        alert_name: userDetail.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetail._id,
        alert_nature: `Funds Sales Approved \nNote: this is to notify you that your ${allSales.transac_category} funds has been approved and your bank account has be credited with the sum of \u20A6${new Intl.NumberFormat().format(totalSales)}.${bonusMoney? `\nYou got a signup bonus awarded to you \u20A6${new Intl.NumberFormat().format(bonusMoney)}. \nTotal Sum is \u20A6${new Intl.NumberFormat().format(gTotal)}.\n`: '\n' }With transaction ID: ${allSales.tid}`,
        alert_status: 1,
        alert_read_date: ''
        })
      }

      // send email to the account owner
      if(userDetail.receive_email_notification == true){
        fetchApp().then((result) => {
          appName = result.app_name
          appLogo = result.app_logo
          const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

          const mailBody = loginEmail(appName, 'Fund Sales Approved', userDetail.display_name, `this is to notify you that your ${allSales.transac_category} funds has been approved and your bank account has be credited with the sum of
          <b>\u20A6${new Intl.NumberFormat().format(totalSales)}</b>. ${bonusMoney? `<br/> Wow... you got some extra money credited to you as signup bonus! <b>\u20A6${new Intl.NumberFormat().format(bonusMoney)}</b> <br>`: '<br>'}
          ${bonusMoney? `<b>Total Amount: \u20A6${new Intl.NumberFormat().format(gTotal)}. <br>` :''}</b>
          With transaction ID <b>${allSales.tid}</b><br>
          Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)
              const mailText = loginText(userDetail.display_name, `this is to notify you that your ${allSales.transac_category} funds sales has been approved and your bank account has be credited with the sum of \n\n
              <b>\u20A6${new Intl.NumberFormat().format(totalSales)}</b><br>
              with transaction ID <b>${allSales.tid}</b><br>
              thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
              let account_issueEMail = {
                from: `${appName} <noreply@ozaapp.com>`,
                to: userDetail.email,
                subject: 'Funds Sales Notification!',
                text: mailText,
                html: mailBody,
              }
              async function main() {
              const info = await transporterMailer.sendMail(account_issueEMail);
                  }
              main().catch('Message Error', console.error);
              }).catch(console.error.bind(console))
          }

        res.status(201).json({msg: '201'}) // success message
     }
     else{
      return res.json({status: 404, message: ' Error occurred, try again'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Rejected user sales funds details here..
router.post("/rejectSaleFunding", isAuth, async (req, res) => {
  let recordId = req.body.tran_id;
  //console.log("MY ID ", userId);
  try {
    if(recordId == '' || recordId == null){
      return res.json({status: 404, message: ' Transaction ID not found'})
    }
    //get all user count details
     const allTranSales = await TransferFund.findOne({_id: recordId} );
     const userDetail = await User.findOne({tag_id: allTranSales.acct_number} );
     
     if(!userDetail){
      return res.json({status: 404, message: ' User record not found'})
     }
     if(!allTranSales){
      return res.json({status: 404, message: ' Transaction not valid'})
     }

     const filterTransaction = { _id: req.body.tran_id };
     const filterGeneral = { _id: allTranSales._id}

     if(userDetail){

      // update general transaction status here
      const updateGeneralStatus = {
        $set: {
          transaction_status: "Rejected",
          approved_date:  Date.now(),
        },
      };

      const updateGeneral = await TransferFund.updateOne(filterGeneral, updateGeneralStatus);
    // check if user enabled in-app notifications and send notification
      if(userDetail.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: userDetail.display_name,
        alert_name: userDetail.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetail._id,
        alert_nature: `Account Funding Issues\nNote: We are unable to verify that the transaction with transaction ID ${allTranSales.tid} was valid or successful!\nPlease, you can contact support for more details and possible resolutions` ,
        alert_status: 1,
        alert_read_date: ''
        })
      }
      const addLogs = await SystemActivity.create({
        log_username: '',
        log_name: userDetail.display_name,
        log_acct_number: userDetail.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Admin staff rejected user funds sales request',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Funds Sales Rejected ',
       })
      // send email to the account owner
      fetchApp().then((result) => {
        appName = result.app_name
        appLogo = result.app_logo
        const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
        const mailBody = loginEmail(appName, 'Funds Sales Issue', userDetail.display_name, `this is to notify you that your recent ${allTranSales.transac_category} funds sales/exchange request was not approved or cancelled after been review your transaction details.
        <br> Amount: <b>\$${new Intl.NumberFormat().format(allTranSales.amount)}</b> <br>
        With transaction ID <b>${allTranSales.tid}</b><br> 
        We are unable to verify that the transaction was valid and successful! Please you can contact support for more details and possible resolutions.<br><br>
        Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)

            const mailText = loginText(userDetail.display_name, `this is to notify you that your recent ${allTranSales.transac_category} funds sales/exchange request was not approved or cancelled after been review your transaction details.
            <br> Amount: <b>\$${new Intl.NumberFormat().format(allTranSales.amount)}</b> <br>
            With transaction ID <b>${allTranSales.tid}</b><br> 
            We are unable to verify that the transaction was valid and successful! Please you can contact support for more details and possible resolutions.<br><br>
            Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
            let account_issueEMail = {
              from: `${appName+' Sales'} <noreply@ozaapp.com>`,
              to: userDetail.email,
              subject: 'Funding Sales Notification!',
              text: mailText,
              html: mailBody,
            }
            async function main() {
            const info = await transporterMailer.sendMail(account_issueEMail);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

        res.status(201).json({msg: '201'}) // success message
     }
     else{
      return res.json({status: 404, message: ' Error occurred, try again'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search funding details with transaction ID here..
router.post("/searchFunding_database", isAuth, async (req, res) => {
  let searchData = req.body.queryData;
  console.log("MY ID ", searchData);
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo ==''){
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get all user count details
     const userQuery = await FundUserAccount.findOne({fund_number: searchData} );
     if(!userQuery){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(userQuery){
      res.send({ msg: '201', feedAll: userQuery})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search funding details with transaction ID here..
router.post("/searchSalesFunding_database", isAuth, async (req, res) => {
  let searchData = req.body.dataInfo;
  
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='') {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get search query with multiple condition from database
     const userQuery = await TransferFund.find({
      $or: [{tid: searchData},
            {pay_tran: searchData}]
           }).sort({ createdOn: -1 }).limit(100);

     if(!userQuery){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(userQuery.length < 1){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(userQuery){
      res.send({ msg: '201', feedAll: userQuery})
      console.log("result ", userQuery)
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search user database with user email or tag ID here..
router.post("/searchUsers_database", isAuth, async (req, res) => {

  let searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='') {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get search query with multiple condition from database
     const queryUser = await User.findOne({
      $or: [{email: searchData},
            {tag_id: searchData}]
           });

     if(!queryUser){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUser.length < 1){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUser){
      // get system settings here
      const { password, password_plain, ...others } = queryUser._doc; // this will remove secret data from the details send to frontend.
      res.send({ msg: '201', feedAll: others})
      //console.log("result ", queryUser)
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search user document from database with user email or tag ID here..
router.post("/searchUsersDocument_database", isAuth, async (req, res) => {

  let searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='') {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get search query with multiple condition from database
     const queryUserDoc = await DocumentUpload.findOne({
      $or: [{owners_email: searchData},
            {track_document: searchData}]
           });

     if(!queryUserDoc){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUserDoc.length < 1){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUserDoc){
      // get system settings here
    
      res.send({ msg: '201', feedAll: queryUserDoc})
      //console.log("result ", queryUser)
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search user bank details from database with user email or tag ID here..
router.post("/searchUsersBank_details", isAuth, async (req, res) => {

  let searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='') {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get search query with multiple condition from database
     const queryUserDoc = await UserBankDetails.findOne({
      $or: [{user_email: searchData},
            {user_tag_id: searchData}]
           });

     if(!queryUserDoc){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUserDoc.length < 1){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUserDoc){
      // get system settings here
    
      res.send({ msg: '201', feedAll: queryUserDoc})
      //console.log("result ", queryUser)
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user bank details via ID passed from bank table here..
router.get("/getBank_UserDetails/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("MY ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
     const userBank = await UserBankDetails.findOne({_id: userId} );
     if(userBank){
      res.send({ msg: '201', feedAll: userBank})
     }
     else{
      return res.json({status: 404, message: ' Records not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user message details via ID passed from bank table here..
router.get("/getUser_message/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
    
     const userMessage = await Ticket.findOne({_id: userId} );
     if(userMessage){
      res.send({ msg: '201', feedAll: userMessage})
     }
     else{
      return res.json({status: 404, message: ' Message not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Send/reply message/ticket to user  here..
router.post("/messageFeedback_send", isAuth, async (req, res) => {
  let recordId = req.body.tran_id;
  const responseMessage = req.body.sendMessage;
  //console.log("Message Reply  ", req.body);
  try {
    if(recordId == '' || recordId == null){
      return res.json({status: 404, message: ' Record ID not found'})
    }
    //get all user count details
    const ticketMessage = await Ticket.findOne({_id: recordId} );
     
     const userDetail = await User.findOne({_id: ticketMessage.createdBy} );
     if(!userDetail){
      return res.json({status: 404, message: ' User record not found'})
     }
     if(!ticketMessage){
      return res.json({status: 404, message: ' Ticket ID not valid'})
     }

     if(userDetail){
      const filterGeneral = { _id: ticketMessage._id}
      // update user balance
      const updateUserTicketStatus = {
        $set: {
          ticket_status: 'Replied',
          ticket_closed:'Replied',
          tick_response_date: Date.now()
        },
      };

      const updateUserBal = await Ticket.updateOne(filterGeneral, updateUserTicketStatus);
      
      const addLogs = await SystemActivity.create({
        log_username: '',
        log_name: userDetail.display_name,
        log_acct_number: userDetail.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:`Admin staff replied to user ticket request ticket ID: ${ticketMessage?.tick_id}`,
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Ticket reply',
       })

       // check if user enabled in-app notifications and send notification
      if(userDetail.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: userDetail.display_name,
        alert_name: userDetail.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetail._id,
        alert_nature: `${responseMessage} with Ticket ID: ${ticketMessage.tick_id}`,
        alert_status: 1,
        alert_read_date: ''
        })
      }

      // send email to the account owner
      fetchApp().then((result) => {
        appName = result.app_name
        appLogo = result.app_logo
        const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
        const mailBody = loginEmail(appName, 'Ticket Feedback', userDetail.display_name, `${responseMessage}
        <b>Ticket ID: ${ticketMessage?.tick_id}</b> <br><br> 
        thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
            const mailText = loginText(userDetail.display_name, `${responseMessage}
            <b>Ticket ID: ${ticketMessage?.tick_id}</b><br>
      
            thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)
            let account_issueEMail = {
              from: `${appName} <noreply@ozaapp.com>`,
              to: userDetail.email,
              subject: 'Account Funding Notification!',
              text: mailText,
              html: mailBody,
            }
            async function main() {
            const info = await transporterMailer.sendMail(account_issueEMail);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

        res.status(201).json({msg: '201'}) // success message
     }
     else{
      return res.json({status: 404, message: ' Error occurred, try again'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search for ticket with ID from database  here..
router.post("/searchTicket_database", isAuth, async (req, res) => {
 let searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='') {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get search query with multiple condition from database
     const queryUserTicket = await Ticket.findOne({
      $or: [{tick_id: searchData},
            {email: searchData}]
           });

     if(!queryUserTicket){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUserTicket.length < 1){
      return res.json({ status: 404, message: ' No results matching your query'})
     }
     if(queryUserTicket){
      // get system settings here
    
      res.send({ msg: '201', feedAll: queryUserTicket})
      //console.log("result ", queryUser)
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// close user message ticket  here..
router.post("/closeUserTicket_message", isAuth, async (req, res) => {
  let recordId = req.body.tran_id;
  //console.log("Message Reply  ", req.body);
  try {
    if(recordId == '' || recordId == null){
      return res.json({status: 404, message: ' Record ID not found'})
    }
    //get all user count details
    const closeMessage = await Ticket.findOne({_id: recordId} );
     
     const userDetail = await User.findOne({_id: closeMessage.createdBy} );
     if(!userDetail){
      return res.json({status: 404, message: ' User record not found'})
     }
     if(!closeMessage){
      return res.json({status: 404, message: ' Ticket ID not valid'})
     }

     if(userDetail){
      const filterGeneral = { _id: closeMessage._id}
      // update user balance
      const updateUserTicketStatus = {
        $set: {
          ticket_status: 'Closed',
          ticket_closed:'Completed',
          tick_response_date: Date.now()
        },
      };

      const updateUserBal = await Ticket.updateOne(filterGeneral, updateUserTicketStatus);
      
      const addLogs = await SystemActivity.create({
        log_username: '',
        log_name: userDetail.display_name,
        log_acct_number: userDetail.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:`Admin staff closed user ticket request ticket ID: ${closeMessage?.tick_id}`,
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Ticket Closed',
       })

       // check if user enabled in-app notifications and send notification
      if(userDetail.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: userDetail.display_name,
        alert_name: userDetail.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetail._id,
        alert_nature: `This is to notified you that your ticket with ID: ${closeMessage.tick_id} has been closed`,
        alert_status: 1,
        alert_read_date: ''
        })
      }

      // send email to the account owner
      fetchApp().then((result) => {
        appName = result.app_name
        appLogo = result.app_logo
        const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

        const mailBody = loginEmail(appName, 'Ticket Closed', userDetail.display_name, `This is to notified you that your <b>Ticket ID: ${closeMessage?.tick_id} </b> has been marked completed and closed! If you still have still any issue please, feel free to get back to us. <br><br> 
        Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)
            const mailText = loginText(userDetail.display_name, `This is to notified you that your <b>Ticket ID: ${closeMessage?.tick_id} </b> has been marked completed and closed! If you still have still any issue please, feel free to get back to us. <br><br> 
            Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
            let ticket_issueEMail = {
              from: `${appName +' Support'} <noreply@ozaapp.com>`,
              to: userDetail.email,
              subject: 'Account Funding Notification!',
              text: mailText,
              html: mailBody,
            }
            async function main() {
            const info = await transporterMailer.sendMail(ticket_issueEMail);
                }
            main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))

        res.status(201).json({msg: '201'}) // success message
     }
     else{
      return res.json({status: 404, message: ' Error occurred, try again'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all system loge activities details here..
router.get("/fetchAll_log", isAuth, async (req, res) => {

  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  // const startIndex = (page -1) * limit;
  // const endIndex = page * limit;

  const skip = (page - 1) * limit;
  try {
    //get all user count details
    const pageCount = await UserLog.find().count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

     const all_logs = await UserLog.find().sort({ createdOn: -1 }).skip(skip).limit(limit);
      
     res.send({ msg: '201', 
      feedAll: all_logs, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search log details from database with user email or IP ID here..
router.post("/searchLogs_database", isAuth, async (req, res) => {

  const searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='' ) {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get search query with multiple condition from database
    const checkData = await UserLog.findOne({
        $or: [{login_username: searchData},
        {login_user_ip: searchData}]
        });
        if(!checkData){
        return res.json({ status: 404, message: ' No results matching your query'})
        }
      const logsUserDoc = await UserLog.find({
        $or: [{login_username: searchData},
              {login_user_ip: searchData}]
            }).sort({ createdOn: -1 }).limit(100);;

      if(!logsUserDoc){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logsUserDoc.length < 1){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logsUserDoc){
        // get system settings here
      
        res.send({ msg: '201', feedAll: logsUserDoc})
        //console.log("result ", logsUserDoc)
      }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get logs details via ID passed from frontend table here..
router.get("/getLogs_byId/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
    
     const userLogs = await UserLog.findOne({_id: userId} );
     if(userLogs){
      res.send({ msg: '201', feedAll: userLogs})
     }
     else{
      return res.json({status: 404, message: ' Message not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all system activities logs details here..
router.get("/fetchAll_systemLog", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if(!page) page = 1;
  if(!limit) limit = 10;

  const skip = (page - 1) * limit;

  try {
    //get all user count details
    const pageCount = await SystemActivity.find().count(); // get total records
    const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

    //get all user count details
     const all_systemLogs = await SystemActivity.find().sort({ createdOn: -1 }).skip(skip).limit(limit);
      res.send({ msg: '201', 
      feedAll: all_systemLogs, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get system activities logs details via ID passed from frontend table here..
router.get("/get_systemLogs_byId/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("ID ", userId);
  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
    
     const userSystemLogs = await SystemActivity.findOne({_id: userId} );
     if(userSystemLogs){
      res.send({ msg: '201', feedAll: userSystemLogs})
     }
     else{
      return res.json({status: 404, message: ' Message not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search system activities log details from database with user email or IP ID here..
router.post("/search_systemLogs_database", isAuth, async (req, res) => {

  const searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
  let pageSearch = parseInt(req.query.pageNumber);
  let limitSearch = parseInt(req.query.pageLimit);
  if(!pageSearch) pageSearch = 1;
  if(!limitSearch) limitSearch = 10;

  const skip = (pageSearch - 1) * limitSearch;

        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='' ) {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get all user count details
    const pageCountSearch = await SystemActivity.find({
      $or: [{log_username: searchData},
            {log_nature: searchData}]
          }).count(); // get total records

    const totalPageNumberSearch = Math.ceil(pageCountSearch / limitSearch); // get the number of pages
          
    //get search query with multiple condition from database
    const checkData = await SystemActivity.findOne({
        $or: [{log_username: searchData},
        {log_nature: searchData}]
        });
        if(!checkData){
        return res.json({ status: 404, message: ' No results matching your query'})
        }
      const logSystem = await SystemActivity.find({
        $or: [{log_username: searchData},
              {log_nature: searchData}]
            }).sort({ createdOn: -1 }).skip(skip).limit(limitSearch);

      if(!logSystem){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem.length < 1){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem){
        // get system settings here
      
        res.send({ msg: '201', feedAll: logSystem, page: pageSearch, limit: limitSearch, totalPage: totalPageNumberSearch, totalRecord: pageCountSearch})
        //console.log("result ", logsUserDoc)
      }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search system activities log with pagination details here..
router.get("/search_systemLogs_pagination", isAuth, async (req, res) => {

  const searchData = req.query.searchData.dataInfo;
  console.log("data ", req.body)
  let pageSearch = parseInt(req.query.pageNumber);
  let limitSearch = parseInt(req.query.pageLimit);
  if(!pageSearch) pageSearch = 1;
  if(!limitSearch) limitSearch = 10;

  const skip = (pageSearch - 1) * limitSearch;

        if(searchData.searchValue == '' || searchData == null || req.query.searchData.dataInfo =='' ) {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get all user count details
    const pageCountSearch = await SystemActivity.find({
      $or: [{log_username: searchData},
            {log_nature: searchData}]
          }).count(); // get total records

    const totalPageNumberSearch = Math.ceil(pageCountSearch / limitSearch); // get the number of pages
          
    //get search query with multiple condition from database
    const checkData = await SystemActivity.findOne({
        $or: [{log_username: searchData},
        {log_nature: searchData}]
        });
        if(!checkData){
        return res.json({ status: 404, message: ' No results matching your query'})
        }
      const logSystem = await SystemActivity.find({
        $or: [{log_username: searchData},
              {log_nature: searchData}]
            }).sort({ createdOn: -1 }).skip(skip).limit(limitSearch);

      if(!logSystem){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem.length < 1){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem){
        // get system settings here
      
        res.send({ msg: '201', feedAll: logSystem, page: pageSearch, limit: limitSearch, totalPage: totalPageNumberSearch, totalRecord: pageCountSearch})
        //console.log("result ", logsUserDoc)
      }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get all system referral activities logs details here..
// router.get("/fetchAll_referral", isAuth, async (req, res) => {
//   let page = parseInt(req.query.pageNumber);
//   let limit = parseInt(req.query.pageLimit);
//   if(!page) page = 1;
//   if(!limit) limit = 10;

//   const skip = (page - 1) * limit;

//   try {
//     //get all user count details
//     const pageCount = await Referrals.find().count(); // get total records
    
//     const totalPageNumber = Math.ceil(pageCount / limit); // get the number of pages

//     //get all user count details
//      const all_systemLogs = await Referrals.find().sort({ createdOn: -1 }).skip(skip).limit(limit);
//       console.log("final Result ", all_systemLogs)
//      res.send({ msg: '201', 
//       feedAll: all_systemLogs, page: page, limit: limit, totalPage: totalPageNumber, totalRecord: pageCount})
//     } catch (err) {
//     res.status(500).json(err.message);
//     console.log(err.message);
//   }
// });

router.get("/fetchAll_referral", isAuth, async (req, res) => {
  let page = parseInt(req.query.pageNumber);
  let limit = parseInt(req.query.pageLimit);
  if (!page) page = 1;
  if (!limit) limit = 10;
  
  const skip = (page - 1) * limit;
  
  try {
  // Get distinct email IDs count
  const distinctCount = (await Referrals.distinct("ref_mainEmail")).length;
  
  const totalPageNumber = Math.ceil(distinctCount / limit);
  
  const distinctEmails = await Referrals.aggregate([
  { $group: { _id: "$ref_mainEmail",
    record_id:{$first: "$_id"},
    ref_mainEmail: { $first: "$ref_mainEmail" },
    ref_mainTag: { $first: "$ref_mainTag" },
    ref_userEmail: { $first: "$ref_userEmail" },
    ref_userName: { $first: "$ref_userName" },
    ref_status: { $first: "$ref_status" },
    active: { $first: "$active" },
    createdBy: { $first: "$createdBy" },
    ref_approvedDate: { $first: "$ref_approvedDate" },
    createdOn: { $first: "$createdOn" }
    } },
    { $sort: { createdOn: -1 } },
    { $skip: skip },
    { $limit: limit }
    ]).exec();
  
  console.log("Final result", distinctEmails);
  res.send({
  msg: '201',
  feedAll: distinctEmails,
  page: page,
  limit: limit,
  totalPage: totalPageNumber,
  totalRecord: distinctCount
  });
  } catch (err) {
  res.status(500).json(err.message);
  console.log(err.message);
  }
  });

// get system referral details via ID passed from frontend table here..
router.get("/get_referral_byId/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("ID ", userId);
  let pageSearch = parseInt(req.query.pageNumber);
  let limitSearch = parseInt(req.query.pageLimit);
  if(!pageSearch) pageSearch = 1;
  if(!limitSearch) limitSearch = 10;
  const skip = (pageSearch - 1) * limitSearch;

  try {
    if(userId == '' || userId == null){
      return res.json({status: 404, message: ' User ID not found'})
    }
    //get all user count details
    
     const userReferrals = await Referrals.findOne({_id: userId} );

     const pageCountSearch = await Referrals.find({
      ref_mainEmail: userReferrals.ref_mainEmail }).count(); // get total records

      const allMyReferral = await Referrals.find({
        ref_mainEmail: userReferrals.ref_mainEmail }).sort({ createdOn: -1 }).skip(skip).limit(limitSearch);

     const totalPageNumberSearch = Math.ceil(pageCountSearch / limitSearch); // get the number of pages

     if(userReferrals){
      res.send({ msg: '201', feedAll: userReferrals, feedAllData: allMyReferral, page: pageSearch, limit: limitSearch, totalPageSearch: totalPageNumberSearch, totalRecord: pageCountSearch})
     }
     else{
      return res.json({status: 404, message: ' Message not found'})
     }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search system referral details from database with user email or tag ID here..
router.post("/search_referral_database", isAuth, async (req, res) => {

  const searchData = req.body.dataInfo;
  //console.log("data ", req.body.dataInfo)
  let pageSearch = parseInt(req.query.pageNumber);
  let limitSearch = parseInt(req.query.pageLimit);
  if(!pageSearch) pageSearch = 1;
  if(!limitSearch) limitSearch = 10;

  const skip = (pageSearch - 1) * limitSearch;

        if(searchData.searchValue == '' || searchData == null || req.body.dataInfo =='' ) {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get all user count details
    const pageCountSearch = await Referrals.find({
      $or: [{ref_mainEmail: searchData},
            {ref_mainTag: searchData}]
          }).count(); // get total records

    const totalPageNumberSearch = Math.ceil(pageCountSearch / limitSearch); // get the number of pages

    // console.log("Total record count ", pageCountSearch)
    //get search query with multiple condition from database
    const searchCheckData = await Referrals.findOne({
        $or: [{ref_mainEmail: searchData},
              {ref_mainTag: searchData}]
            });
        if(!searchCheckData){
        return res.json({ status: 404, message: ' No results matching your query'})
        }
      const logSystem = await Referrals.find({
        $or: [{ref_mainEmail: searchData},
              {ref_mainTag: searchData}]
            }).sort({ createdOn: -1 }).skip(skip).limit(limitSearch);

      if(!logSystem){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem.length < 1){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem){
        // get system settings here
      
        res.send({ msg: '201', feedAllData: logSystem, page: pageSearch, limit: limitSearch, totalPage: totalPageNumberSearch, totalRecord: pageCountSearch})
        //console.log("result ", logsUserDoc)
      }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// Search system referral activities with pagination details here..
router.get("/search_referral_pagination", isAuth, async (req, res) => {

  const searchData = req.query.searchData.dataInfo;
  console.log("data ", req.body)
  let pageSearch = parseInt(req.query.pageNumber);
  let limitSearch = parseInt(req.query.pageLimit);
  if(!pageSearch) pageSearch = 1;
  if(!limitSearch) limitSearch = 10;

  console.log("Data send ", searchData)

  const skip = (pageSearch - 1) * limitSearch;

        if(searchData.searchValue == '' || searchData == null || req.query.searchData.dataInfo =='' ) {
          return res.json({status: 404, message: ' Query parameters is empty!'})
        }
  try {
    //get all user count details
    const pageCountSearch = await Referrals.find({
      $or: [{ref_mainEmail: searchData},
            {ref_mainTag: searchData}]
          }).count(); // get total records

    const totalPageNumberSearch = Math.ceil(pageCountSearch / limitSearch); // get the number of pages
      
    //get search query with multiple condition from database
    const checkData = await Referrals.findOne({
        $or: [{ref_mainEmail: searchData},
        {ref_mainTag: searchData}]
        });
        if(!checkData){
        return res.json({ status: 404, message: ' No results matching your query'})
        }
      const logSystem = await Referrals.find({
        $or: [{ref_mainEmail: searchData},
          {ref_mainTag: searchData}]
            }).sort({ createdOn: -1 }).skip(skip).limit(limitSearch);

      if(!logSystem){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem.length < 1){
        return res.json({ status: 404, message: ' No results matching your query'})
      }
      if(logSystem){
        // get system settings here
      
        res.send({ msg: '201', feedAllData: logSystem, page: pageSearch, limit: limitSearch, totalPage: totalPageNumberSearch, totalRecord: pageCountSearch})
        //console.log("result ", logsUserDoc)
      }
     } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// approve referral bonus amount and credit user wallet here..
router.get("/approveReferral_bonus/:id", isAuth, async (req, res) => {

  let recordId = req.params.id;
  //console.log("data ", req.params.id)

  if(recordId == '' || recordId == null){
    return res.json({status: 404, message: ' Record ID not found'})
  }

  try {

    //get all user count details
    const checkReferral = await Referrals.findOne({_id: recordId });
        if(!checkReferral){
        return res.json({ status: 404, message: ' No results found, try again'})
        }
        //console.log(checkReferral)
        if(checkReferral.ref_status == 'Successful' || checkReferral.ref_status == 'Approved'){
          return res.json({ status: 404, message: ' Referral bonus already added'})
          }
      // // get user details
      const checkUser = await User.findOne({email: checkReferral.ref_mainEmail });
      //console.log(checkUser)
      if(!checkUser){
        return res.json({ status: 404, message: ' User details not found' });
      }
      // // get current trade rates
      const checkTradeRate = await GetRate.findOne();
      
      let addAmount = parseInt(checkTradeRate.bonus_rate) * parseInt(checkTradeRate.paypal_buying);
      //console.log(addAmount)

      const NowCurrentBal = checkUser.amount+ +addAmount

      if(checkUser){
        const filterUser = { _id: checkUser._id };
        const filterReferral = { _id: recordId };
        
        const updateReferralStatus = {
          $set: {
            ref_status: 'Approved',
            ref_approvedDate: Date.now()
          },
        };

        const updateUserBalance = {
          $set: {
            amount: NowCurrentBal,
          },
        };

        const updateUserBal = await User.updateOne(filterUser, updateUserBalance);
        const updateRef = await Referrals.updateOne(filterReferral, updateReferralStatus);


      const addLogs = await SystemActivity.create({
        log_username: checkUser.email,
        log_name: checkUser.display_name,
        log_acct_number: checkUser.tag_id,
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Admin staff approved user referral bonus request',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Bonus fund Approved',
       })

       // check if user enabled in-app notifications and send notification
      if(checkUser.receive_app_message == true) {
        const userLogs = Notification.create({
        alert_username: checkUser.display_name,
        alert_name: checkUser.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: checkUser._id,
        alert_nature: `Referral Bonus Approved \n Note: this is to notify you that your referral bonus funds has been approved and your account has be credited with the sum of
        \u20A6${new Intl.NumberFormat().format(addAmount)} \n\n for your hard work by sharing your referral ID! \n\n Keep referring to keep earning...`,
        alert_status: 1,
        alert_read_date: ''
        })
      }

      // send email to the account owner
      if(checkUser.receive_email_notification == true){
        fetchApp().then((result) => {
          appName = result.app_name
          appLogo = result.app_logo
          const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

          const mailBody = loginEmail(appName, 'Referral Bonus Approved', checkUser.display_name, `this is to notify you that your referral bonus funds has been approved and your account has be credited with the sum of \n\n
          <b>\u20A6${new Intl.NumberFormat().format(addAmount)}</b> for your hard work for sharing your referral Tag ID <br>
          </b><br>  Keep it up and keep referring your friends, loves one to continue earning... <br>
          Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`, logoImage)
          
          const mailText = loginText(checkUser.display_name, `this is to notify you that your referral bonus funds has been approved and your account has be credited with the sum of \n\n
          <b>\u20A6${new Intl.NumberFormat().format(addAmount)}</b> for your hard work for sharing your referral Tag ID <br>
          </b><br>  Keep it up and keep referring your friends, loves one to continue earning... <br>
          Thank you for choosing ${appName}, we hope you continue enjoy our awesome services.`)
          let account_issueEMail = {
            from: `${appName} <noreply@ozaapp.com>`,
            to: checkUser.email,
            subject: 'Funds Credit Notification!',
            text: mailText,
            html: mailBody,
          }
          async function main() {
          const info = await transporterMailer.sendMail(account_issueEMail);
              }
          main().catch('Message Error', console.error);
          }).catch(console.error.bind(console))
      }
      
      res.send({ msg: '201', feedAll: true })
      }
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

router.get("/allPayPal_sales", isAuth, async (req, res) => {
  //console.log("My ID", userId);
  try {
    const payPayTran = await TransferFund.aggregate(
      [{$match: {transaction_status: 'Successful', transac_category:'Paypal'} },
      {$group: {_id: null, totalAmount: { $sum: '$amount' }}}]
    );
    //console.log("My Paypal ", payPayTran);
    res.send({ msg: '201', feedPaypal: payPayTran})
  } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user wallet chat data account here..
router.get("/chart_transactions/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("My ID", userId);

  const dateStart = moment().format('YYYY-MM-DD hh:mm:ss');
  const dateLast = moment().subtract(7,'d').format('YYYY-MM-DD hh:mm:ss');

  const startMonth = moment().startOf('month').format('YYYY-MM-DD hh:mm:ss');
  const endMonth = moment().endOf('month').format('YYYY-MM-DD hh:mm:ss');

  const startYear = moment().startOf('year').format('YYYY-MM-DD hh:mm:ss');
  const endYear = moment().endOf('year').format('YYYY-MM-DD hh:mm:ss');

  try {
       //console.log('Balance ', userWalletBalance)
       // paypal chart total report
    const payPalChartWallet = await TransferFund.aggregate(
      [{$match: {createdBy: userId, transaction_status: 'Successful', transac_category:'Paypal'} },
      {$group: {_id: null, totalAmount: { $sum: '$amount' }}}]
      );

      // payoneer chart total report
      const payoneerChartWallet = await TransferFund.aggregate(
        [{$match: {createdBy: userId, transaction_status: 'Successful', transac_category:'Payoneer'}},
        {$group: {_id: null, totalAmount: { $sum: '$amount' }}}]
        );

        // bitcoin chart total report
        const bitCoinChartWallet = await TransferFund.aggregate(
          [{$match: {createdBy: userId, transaction_status: 'Successful', transac_category:'Bitcoin'}, },
          {$group: {_id: null, totalAmount: { $sum: '$amount' }}}]
          );

          const userDetails = await User.findOne({_id: userId })
          
      // annually chart total report
        let yearTotal = 0;
        const chartYear = await FundUserAccount.find(
          {
            fund_tag_id: userDetails.tag_id, fund_status: 'Approved',
            creditOn: {$gte: startYear, $lt: endYear}, 
          });
          yearTotal = chartYear.reduce((sum, transaction) => sum + transaction.amount, 0);

      // monthly chart total report
        let monthlyTotal = 0;
        const chartMonthly = await FundUserAccount.find(
          {
            fund_tag_id: userDetails.tag_id, fund_status: 'Approved',
            creditOn: {$gte: startMonth, $lt: endMonth}, 
          });
          monthlyTotal = chartMonthly.reduce((sum, transaction) => sum + transaction.amount, 0);
      
      // weekly chart total report
      let weeklyAmount = 0;
      const chartWeekly = await FundUserAccount.find({
        fund_tag_id: userDetails.tag_id, fund_status: 'Approved',
        creditOn: {$gte: dateLast}
      });
      weeklyAmount = chartWeekly.reduce((sum, transaction) => sum + transaction.amount, 0);

      //console.log("Weekly", weeklyAmount)
      // console.log("Monthly ", monthlyTotal)
      // console.log("All Year ", yearTotal)
      // console.log("Monthly Total ", monthlyTotal)
      res.send({ msg: '201', paypal: payPalChartWallet, 
      payoneer:payoneerChartWallet, 
      bitcoin: bitCoinChartWallet,
      weekly: weeklyAmount,
      monthly: monthlyTotal,
      yearly: yearTotal})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

router.get("/user_acct_summary/:id", async (req, res) => {
  let userId = req.params.id;
  //console.log("My ID", userId);
  try {
    const userTransacPending = await TransferFund.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: "$transac_nature", totalAmount: { $sum: "$amount" } } },
    ]);
    res.status(200).send(userTransacPending);
  } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});



module.exports = router;