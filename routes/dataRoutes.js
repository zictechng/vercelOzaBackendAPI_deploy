 const express = require('express');
const router = express.Router()
const jwt = require("jsonwebtoken");

const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

const multer = require("multer");

const nodemailer = require("nodemailer");

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
const transporter = require('../controllers/mailSender');
const { isAuth } = require('../middleware/auth');
const userBankDetails = require('../models/UserBankDetails');
const DocumentUpload = require('../models/DocumentUpload');
const Referrals = require('../models/referralUser');
const moment = require('moment/moment');
const { getBeginningOfTheWeek } = require('../middleware/getStartDate');
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

var upload = multer({ storage: storage });

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
 
// get company name details here..
router.get("/fetchApp_info", async (req, res) => {
  try {
    const getAppSetting = await AppSetting.findOne();
    //.sort({field_name: sort order})
    if(!getAppSetting){
      return res.json({status: 404, message: 'No record found'})
    }
    else if(getAppSetting){
      //console.log(getAppSetting.app_name)
     
      res.status(200).json({msg: '200', infoData: getAppSetting}) // success message
    }
    //console.log('App name: ' + appName)
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// route to get logged in user profile details
// get current user account details/profile here..
router.get("/profile/:id", async (req, res) => {
    let userId = req.params.id;
    try {
      const userDetails = await User.findOne({ _id: userId });
     //   const userTransacSuccess = await TransferFund.aggregate([
    //     { $match: { createdBy: userId } },
    //     {
    //       $group: {
    //         _id: "$transaction_status",
    //         totalAmount: { $sum: "$amount" },
    //       },
    //     },
    //   ]);
  
      const { password, ...others } = userDetails._doc; // this will remove password from the details send to server.
  
      res.status(200).send({ others });
    } catch (err) {
      res.status(500).json(err.message);
      console.log(err.message);
    }
  });

  // get current user account details/profile here..
router.get("/userProfileMobile/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log(userId);
  try {
    const userDetails = await User.findOne({ _id: userId });
    const getAppSetting = await AppSetting.findOne();
    const { password, ...others } = userDetails._doc; // this will remove password from the details send to server.

    res.send({ msg: '200', userData: others, appData: getAppSetting})
  } catch (err) {
    if(!userDetails(err)) {
        console.log("user found found");
    }
    throw err;
}
});

  // get users bank details via Mobile 
router.get("/user_bankDetails/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log(" userId: " + userId)
  if(req.params.id === undefined) {
    return res.json({status: 403, message: 'Access denied'});
  }
  try {
    const userDetails = await userBankDetails.findOne({ user_id: userId });
    if(!userDetails){
      return res.json({status: 404, message: 'No record found'})
    }

    res.send({ msg: '200', bankDetail: userDetails})

  } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});
  
// get company name details here..
router.get("/company_name", async (req, res) => {
 
  try {
    const comp = await AppSetting.findOne();
    //.sort({field_name: sort order})
    if(!comp){
      res.status(404).send({msg: "404"})
    }
    else if(comp){
      res.status(200).send(comp);
    }
     
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get company name details here..
router.get("/fetchAboutCompany", async (req, res) => {
 
  try {
    const compInfo = await CompanyDetails.findOne();
    //.sort({field_name: sort order})
    if(!compInfo){
      return res.json({status: 404, message: 'No record found'})
    }
    else if(compInfo){
      //res.status(200).send(compInfo);
      res.status(200).json({msg: '200', infoData: compInfo}) // success message
    }
     
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get business current selling/buying rate here..
router.get("/fetchRate", async (req, res) => {
 
  try {
    const businessRate = await GetRate.findOne();
    const getBankDetails = await CompanyBank.findOne();
    //.sort({field_name: sort order})
    if(!businessRate){
      return res.json({status: 404, message: 'No rate found'})
    }
    else if(businessRate){
      //res.status(200).send(compInfo);
      res.status(200).json({msg: '200', infoData: businessRate}) // success message
    }
     
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get business current selling/buying rate here..
router.get("/fetchBankInfo", async (req, res) => {
 
  try {
    const getBankDetails = await CompanyBank.findOne();
    //.sort({field_name: sort order})
    if(!getBankDetails){
      return res.json({status: 404, message: 'No rate found'})
    }
    else if(getBankDetails){
      //res.status(200).send(compInfo);
      res.status(200).json({msg: '200', bankData: getBankDetails}) // success message
    }
     
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});
  // get recent transaction of the user financial details here..
router.get("/recent_transactions/:id", isAuth, async (req, res) => {
    let userId = req.params.id;
    //console.log("Recent record ", userId);
    try {
      const recentTransaction = await TransferFund.find({createdBy: userId})
      .sort({ creditOn: -1 }).limit(5);
      res.send(recentTransaction)
        //console.log("Data fetch", recentTransaction)
    } catch (err) {
      res.status(500).json(err.message);
      console.log(err.message);
    }
  });
  // get recent transaction of the user financial details here..
  // router.get("/all_transaction/:id", async (req, res) => {

  // const page = 1;
  // const userId = req.params.id;
  // const limit = 5;
  // const totalItems = 0;
  // const skip = (page - 1) * limit;
  //   try {
  //     const recentTransaction = await TransferFund.find({createdBy: userId})
  //     .sort({ creditOn: -1 });
  //     res.send(recentTransaction)
  //    } catch (err) {
  //     res.status(500).json(err.message);
  //     console.log(err.message);
  //   }
  // });

  // router.get("/all_statement/:id", async (req, res) => {
  //   const userId = req.params.id;
  //   const itemsPerPage = 5; // Number of transactions per page
  //   const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
  //   const skip = (page - 1) * itemsPerPage;
    
  //   console.log("Details got from frontend", req.params.id + ' / ' + page );
  //   const countAll = await TransferFund.find({createdBy: userId }).count();
    
  //   const pageTotal = (Math.ceil(countAll / itemsPerPage));
  //       if (countAll == 0 || countAll < 1){
  //         console.log(" No record found: ", pageTotal);
  //         return res.json({status: 404, message: 'No record found'})
  //       }
    
  //       if (page > pageTotal){
  //           console.log(" No more pages to display")
  //         return res.json({status: 401, message: 'No more records'})
  //       }
  //       else{
  //       console.log(" Page Total is: ", pageTotal);

  //       console.log(" Total Records is: ", countAll);

  //       console.log(" Current Page is: ", page);

  //         try {
  //           const recentTransaction = await TransferFund.find({createdBy: userId }) // Use the user ID in the query
  //           .sort({ creditOn: -1 })
  //           .skip(skip)
  //           .limit(itemsPerPage);
        
  //           if(!recentTransaction || recentTransaction < 1){
  //             console.log(" No record: ", pageTotal);
  //             return res.json({status: 405, message: 'No more records'})
  //           }
  //           console.log(recentTransaction)
  //           res.send({result: recentTransaction, all_page: pageTotal, all_records: countAll });
  //           } catch (err) {
  //           res.status(500).json({ error: err.message });
  //           }
  //       }
  //   });

  // get recent transaction of the user financial details here..
  
  
router.get("/all_statementMobile/:id", async (req, res) => {
    const userId = req.params.id;
    const itemsPerPage = 15; // Number of transactions per page
    const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
    const skip = (page - 1) * itemsPerPage;
      const countAll = await TransferFund.find({createdBy: userId }).count();
    
    const pageTotal = (Math.ceil(countAll / itemsPerPage));
        if (countAll == 0 || countAll < 1){
          
          return res.json({status: 401, message: 'No record found'})
        }
    try {
    
    const recentTransaction = await TransferFund.find({createdBy: userId }) // Use the user ID in the query
    .sort({ creditOn: -1 })
    .skip(skip)
    .limit(itemsPerPage);
    
    //console.log(" Total Records is: ", countAll);
    
    if(!recentTransaction || recentTransaction < 1){
      return res.json({status: 404, message: 'No more records'})
    }
    //console.log(recentTransaction)
    res.send(recentTransaction);
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
    });

    // all history transactions here
router.get("/all_historyMobile/:id", isAuth, async (req, res) => {
      const userId = req.params.id;
      const itemsPerPage = 15; // Number of transactions per page
      const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
      const skip = (page - 1) * itemsPerPage;
      const countAll = await TransferFund.find({createdBy: userId }).count();
      
      const pageTotal = (Math.ceil(countAll / itemsPerPage));
          if (countAll == 0 || countAll < 1){
            
            return res.json({status: 401, message: 'No record found'})
          }
      try {
      
      const recentTransaction = await TransferFund.find({createdBy: userId }) // Use the user ID in the query
      .sort({ creditOn: -1 })
      .skip(skip)
      .limit(itemsPerPage);
      
      //console.log(" Total Records is: ", countAll);
      
      if(!recentTransaction || recentTransaction < 1){
        return res.json({status: 404, message: 'No more records'})
      }
      //console.log(recentTransaction)
      res.send(recentTransaction);
      } catch (err) {
      res.status(500).json({ error: err.message });
      }
      });
// history base on paypal transaction
router.get("/all_historyMobilePapay/:id",isAuth, async (req, res) => {
        const userId = req.params.id;
        const paypalSales = 'PayPal'
        const filterReceiver = 'Paypal';
        const user_id = {_id: req.params.id }
        const itemsPerPage = 15; // Number of transactions per page
        const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
        const skip = (page - 1) * itemsPerPage;
        const countAll = await TransferFund.find({createdBy: userId, transac_category: paypalSales }).count();
        //console.log("Paypal called ", countAll)
        const pageTotal = (Math.ceil(countAll / itemsPerPage));
            if (countAll == 0 || countAll < 1){
              //console.log("Paypal no record")
              return res.json({status: 401, message: 'No record found'})
            }
        try {
        // Query base on some conditions here
        const recentTransactionPaypal = await TransferFund.find(
          { $and: [
              { createdBy: userId, transac_category: paypalSales },
             ]}
         ) // Use the user ID in the query
        .sort({ creditOn: -1 })
        .skip(skip)
        .limit(itemsPerPage);
        
        //console.log(" Total Records is: ", recentTransactionPaypal);
        
        if(!recentTransactionPaypal || recentTransactionPaypal < 1){
          return res.json({status: 404, message: 'No more records'})
        }
        //console.log(recentTransactionPaypal)
        res.send(recentTransactionPaypal);
        } catch (err) {
        res.status(500).json({ error: err.message });
        }
        });
    
// history base on paypal transaction
router.get("/all_historyMobilePayooner/:id",isAuth, async (req, res) => {
  const userId = req.params.id;
  const paypalSales = 'Payoneer'
  const itemsPerPage = 15; // Number of transactions per page
  const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
  const skip = (page - 1) * itemsPerPage;
    const countAll = await TransferFund.find({createdBy: userId, transac_category: paypalSales }).count();
  
  const pageTotal = (Math.ceil(countAll / itemsPerPage));
      if (countAll == 0 || countAll < 1){
        
        return res.json({status: 401, message: 'No record found'})
      }
        try {
          // Query base on some conditions here
          const recentTransaction = await TransferFund.find(
            { $and: [
              { createdBy: userId, transac_category: paypalSales },
            ]}) 
        .sort({ creditOn: -1 })
        .skip(skip)
        .limit(itemsPerPage);
        
        //console.log(" Total Records is: ", countAll);
  
          if(!recentTransaction || recentTransaction < 1){
            return res.json({status: 404, message: 'No more records'})
          }
          //console.log(recentTransaction)
          res.send(recentTransaction);
          } catch (err) {
          res.status(500).json({ error: err.message });
          }
    });
        
// history base on paypal transaction
router.get("/user_referrals/:id",isAuth, async (req, res) => {
  const userId = req.params.id;
  const paypalSales = 'Referrals';
  const itemsPerPage = 15; // Number of transactions per page
  const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
  const skip = (page - 1) * itemsPerPage;
  const countAll = await Referrals.find({createdBy: userId}).count();
  
  const pageTotal = (Math.ceil(countAll / itemsPerPage));
      if (countAll == 0 || countAll < 1){
        
        return res.json({status: 404, message: 'No record found'})
      }
        try {
          // { $and: [
          //   { createdBy: userId, transac_category: paypalSales },
          // ]}
          // Query base on some conditions here
          const allReferral = await Referrals.find({createdBy: userId}) 
        .sort({ creditOn: -1 })
        .skip(skip)
        .limit(itemsPerPage);
        //console.log(" Total Records is: ", countAll);
          if(!allReferral || allReferral < 1){
            return res.json({status: 404, message: 'No more records'})
          }
          //console.log(allReferral)
          res.send(allReferral);
          } catch (err) {
          res.status(500).json({ error: err.message });
          }
    });

router.get("/all_transactions", async (req, res) => {
    let userId = req.params.id;
    try {
      const recentTransaction = await TransferFund.find()
      .sort({ creditOn: -1 }).limit(10);
      res.send(recentTransaction)
      // res.send({ msg: '200', data: recentTransaction})
      //res.json({status: 201, message: ' Login Successful'})
      //res.status(200).send(recentTransaction);
    } catch (err) {
      res.status(500).json(err.message);
      console.log(err.message);
    }
  });

  // get account history statement here..
router.get("/history-wallet/:id", isAuth, async (req, res) => {
    let userId = req.params.id;
    //console.log(userId);
    try {
      const walletStatement = await FundUserAccount.find({ fund_tag_id: userId })
        .sort({ creditOn: -1 })
        .limit(10);
      //const totalItems =  await TransferFund.countDocuments()
      res.status(200).send(walletStatement);
      //console.log(walletStatement);
    } catch (err) {
      res.status(500).json(err);
      console.log(err.message);
    }
  });

  // get user wallet account balance here..
router.get("/user_Wallet_summary/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("My ID", userId);
  try {
       //console.log('Balance ', userWalletBalance)
    const userWallet = await FundUserAccount.aggregate(
      [{$match: {fund_tag_id: userId, fund_status: 'Approved'}, },
      {$group: {_id: null, totalAmount: { $sum: '$amount' }}}]
      );

      // const weeklyReport = await FundUserAccount.aggregate(
      //   [{
      //     $group: {
      //     _id: {
      //     $switch: {
      //     branches: [
      //     { case: { $eq: [interval, 'weekly'] }, then: { $week: '$createdOn' } },
      //     { case: { $eq: [interval, 'monthly'] }, then: { $month: '$createdOn' } },
      //     { case: { $eq: [interval, 'yearly'] }, then: { $year: '$createdOn' } },
      //     ],
      //     default: '$fund_status',
      //     },
      //     },
      //     totalAmount: { $sum: '$amount' },
      //     },
      //     }],
      // )
      
        //console.log("wallet weekly ", weeklyReport)
      res.send({ msg: '201', feedback: userWallet})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user wallet chat data account here..
router.get("/chart_transactions/:id", isAuth, async (req, res) => {
  let userId = req.params.id;
  //console.log("My ID", userId);

  dateStart = moment().format('YYYY-MM-DD hh:mm:ss');
  dateLast = moment().add(7,'d').format('YYYY-MM-DD hh:mm:ss');

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

      // annually chart total report
        let yearTotal = 0;
        const chartYear = await TransferFund.find(
          {
            createdBy: userId, transaction_status: 'Successful',
            creditOn: {$gte: startYear, $lt: endYear}, 
          });
          yearTotal = chartYear.reduce((sum, transaction) => sum + transaction.amount, 0);

      // monthly chart total report
        let monthlyTotal = 0;
        const chartMonthly = await TransferFund.find(
          {
            createdBy: userId, transaction_status: 'Successful',
            creditOn: {$gte: startMonth, $lt: endMonth}, 
          });
          monthlyTotal = chartMonthly.reduce((sum, transaction) => sum + transaction.amount, 0);
      
      // weekly chart total report
      let weeklyAmount = 0;
      const chartWeekly = await TransferFund.find({
      createdBy: userId, transaction_status: 'Successful',
      creditOn: { $gte: dateStart, $lt: dateLast,}
      });
      weeklyAmount = chartWeekly.reduce((sum, transaction) => sum + transaction.amount, 0);

      // console.log("Start Year", startYear)
      // console.log("End Year ", endYear)
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

// user request route to block their account goes here...
router.post("/block_user_acct", isAuth, async (req, res) => {
  const userId = req.body;
    //console.log("My Blocked ID: ", req.body)
  // get the transfer record ID here
  const filter = { _id: userId.block_id };
      if (userId == "" || userId == null) {
       return res.status(401).send({ msg: "401" }); // cot code required
      }
  try {
        let userDetails = await User.findOne({ _id:  userId.block_id }); // here I am checking if user exist then I will get user details
        if (!userDetails) {
          //console.log("User details: ", userDetails)
          res.status(404).send({ msg: '404' }); // user not found
        } 
        else if (userDetails){
      // update user account status to blocked
          const updateDoc = {
            $set: {
              acct_status: "Blocked",
              },
          };
           const result = await User.updateOne(filter, updateDoc);
            //console.log("User details: ", result)
            // check if the record has been updated
            if(result.modifiedCount > 0) {
              // user logs status here.
              if(userDetails.receive_app_message){
                const userLogs = Notification.create({
                  alert_username: userDetails.email,
                  alert_name: userDetails.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date:  Date.now(),
                  alert_user_id: userDetails._id,
                  alert_nature: 'Your account was currently blocked! contact admin for support and unlocked the account',
                  alert_status: 1,
                  alert_read_date: ''
                 })
              }
              
              res.status(201).send({ msg: "201" });
            }
            else {
              res.status(403).send({ msg: "403" });
            }
        }
    } catch (err) {
    res.status(500).send({ msg: "500" });
  }
});

// Block user account status from mobile app here..
router.post("/block_AccountMobile", isAuth, async (req, res) => {
  //console.log("Backend Data receive ", req.body)
  const filter = { _id: req.body.uid };

   try {
     const checkUser = await User.findOne({ _id:  req.body.uid }); // here I am checking if user exist then I will get user details
     if (!checkUser) {
       //console.log("User details: ", userDetails)
       res.json({status: 401, message: ' No user found'})
       return
     } 
    if (checkUser){
      // set deactivation status here ...
      const updateDoc = {
        $set: {
          acct_status: 'Deactivated',
          },
      }
      const updateRead = await User.updateOne(filter, updateDoc);
     
        const addLogs = await SystemActivity.create({
          log_username: checkUser.email,
          log_name: checkUser.display_name,
          log_acct_number: checkUser.tag_id,
          log_receiver_name: '',
          log_receiver_number:'',
          log_receiver_bank: '',
          log_country: '',
          log_swift_code: '',
          log_desc:'Request account blocking',
          log_amt: '',
          log_status: 'Successful',
          log_nature:'Account blocked',
         });
         if(checkUser.receive_app_message === true) {
          const userLogs = Notification.create({
            alert_username: checkUser.email,
            alert_name: checkUser.display_name,
            alert_user_ip: '',
            alert_country: '',
            alert_browser: '',
            alert_date:  Date.now(),
            alert_user_id: checkUser._id,
            alert_nature: 'User requested for account blocking for some reasons',
            alert_status: 1,
            alert_read_date: ''
          });
  
         }
        
      // email notification sending
    if(checkUser.receive_email_notification == true){
      // get app detals
      fetchApp().then((result) =>{
        appName = result.app_name
        const mailBody = loginEmail(appName, 'Account Security', checkUser.display_name, 'this is to notify you that your request to block your account was successful \n Contact admin to unlock the account any time thank you.')
        const TextBody = loginText(checkUser.display_name, 'this is to notify you that your request was submitted successfully, your account has been blocked.');
        let mailOptions = {
            from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
            to: checkUser.email,
            subject: 'Account security!',
            text: TextBody,
            html: mailBody,
        }
          // async..await is not allowed in global scope, must use a wrapper
          async function main() {
            const info = await transporter.sendMail(mailOptions);
            }
        main().catch('Message Error', console.error);
        //console.log('Data route Name ', result.app_name)
       }).catch(console.error.bind(console))
    }   
      //res.status(200).send({ msg: "200" });
      res.send({ msg: '200'})
      //res.status(201).json({msg: '201'}) // success message
      }    
    } catch (err) {
    res.status(500).send({ msg: "500" });
  }

});

// Block user account status from mobile app here..
router.post("/reset_AccountPINMobile", isAuth, async (req, res) => {
  //console.log("Backend Data receive ", req.body)
  const filter = { _id: req.body.uid };

   try {
     let checkUser = await User.findOne({ _id:  req.body.uid }); // here I am checking if user exist then I will get user details
     if (!checkUser) {
       //console.log("User details: ", userDetails)
       res.json({status: 401, message: ' No user found'})
     } 
     else if (checkUser){
      // set deactivation status here ...
      const updateDoc = {
        $set: {
          acct_pin: req.body.new_pin,
          },
      }
      const updateRead = await User.updateOne(filter, updateDoc);
      if(updateRead){
        const addLogs = await SystemActivity.create({
          log_username: checkUser.email,
          log_name: checkUser.display_name,
          log_acct_number: checkUser.tag_id,
          log_receiver_name: '',
          log_receiver_number:'',
          log_receiver_bank: '',
          log_country: '',
          log_swift_code: '',
          log_desc:'Request pin update',
          log_amt: '',
          log_status: 'Successful',
          log_nature:'Account pin updated',
         });
         if(checkUser.receive_app_message == true) {
          const userLogs = Notification.create({
            alert_username: checkUser.email,
            alert_name: checkUser.display_name,
            alert_user_ip: '',
            alert_country: '',
            alert_browser: '',
            alert_date:  Date.now(),
            alert_user_id: checkUser._id,
            alert_nature: 'User requested for account pin change for some reasons',
            alert_status: 1,
            alert_read_date: ''
        });
         }
     // email notification sending 
     if(checkUser.receive_email_notification == true){
           // async..await is not allowed in global scope, must use a wrapper
           fetchApp().then((result) =>{
            appName = result.app_name
            const mailBody = loginEmail(appName, 'Account Security', checkUser.display_name, 'this is to notify you that your support ticket was submitted successfully, we will get in-touch shortly thank you')
            const TextBody = loginText(checkUser.display_name, 'this is to notify you that your request was submitted successfully, your account PIN been updated.');
           let Account_mailOptions = {
               from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
               to: checkUser.email,
               subject: 'Account security!',
               text: TextBody,
               html: mailBody,
           }
             // async..await is not allowed in global scope, must use a wrapper
             async function main() {
               const info = await transporter.sendMail(Account_mailOptions);
               }
           main().catch('Message Error', console.error);
            }).catch(console.error.bind(console))
           
         }
   
     //res.status(200).send({ msg: "200" });
      res.send({ msg: '200'})
      }
         
    }
 } catch (err) {
 res.status(500).send({ msg: "500" });
}

});

// submit ticket details from mobile app here..
router.post("/submit_ticketMobile", isAuth, async (req, res) => {
    //console.log("Backend Data receive ", req.body)
   try {
     let checkUser = await User.findOne({ _id:  req.body.createdBy }); // here I am checking if user exist then I will get user details
     if (!checkUser) {
       //console.log("User details: ", userDetails)
       res.json({status: 401, message: ' No user found'})
     } 
     else if (checkUser){
   
       const sumbitTicket = await Ticket.create(req.body)
         // create log here
      const addLogs = await SystemActivity.create({
       log_username: checkUser.email,
       log_name: checkUser.display_name,
       log_acct_number: checkUser.tag_id,
       log_receiver_name: '',
       log_receiver_number:'',
       log_receiver_bank: '',
       log_country: '',
       log_swift_code: '',
       log_desc:'Created support ticket',
       log_amt: '',
       log_status: 'Successful',
       log_nature:'Ticket created',
      });
      if(checkUser.receive_app_message === true){
        const userLogs = Notification.create({
          alert_username: checkUser.email,
          alert_name: checkUser.display_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: checkUser._id,
          alert_nature: 'You created a ticket for support! If you did not receive any feedback withing 24hours, please be patient',
          alert_status: 1,
          alert_read_date: ''
        });
      }
     
   // email notification sending
   if(checkUser.receive_email_notification === true){
      fetchApp().then((result) =>{
        appName = result.app_name
        const mailBody = loginEmail(appName, 'Open Ticket for Support', checkUser.display_name, 'this is to notify you that your support ticket was submitted successfully, we will get in-touch shortly thank you.')
        const TextBody = loginText(checkUser.display_name, 'this is to notify you that your was submitted successfully, your account officer will get in-touch thank you.');
        let tickMailOptions = {
        from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
        to: checkUser.email,
        subject: 'Open Ticket for Support!',
        text: TextBody,
        html: mailBody,
    }
      // async..await is not allowed in global scope, must use a wrapper
      async function main() {
        const info = await transporter.sendMail(tickMailOptions);
        }
    main().catch('Message Error', console.error);
      }).catch(console.error.bind(console))
    
   }
  // async..await is not allowed in global scope, must use a wrapper
  
    //res.status(200).send({ msg: "200" });
   res.send({ msg: '200'})
    }
 } catch (err) {
 //res.status(500).send({ msg: "500" });
 return res.json({status: 500, message: 'Server error: ' })
}

});

 // get user notification from Mobile here here..
 router.get("/user_notificationMobile/:id", isAuth, async (req, res) => {
  let myId = req.params.id;
  //console.log('My ID ', req.params.id)
  const itemsPerPage = 10; // Number of transactions per page
  const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
  const skip = (page - 1) * itemsPerPage;
  const countAll = await Notification.find({alert_user_id: myId }).count();
  const filter = {alert_user_id: myId, alert_status: 1}
    
    const pageTotal = (Math.ceil(countAll / itemsPerPage));
        if (countAll == 0 || countAll < 1){
          
          return res.json({status: 401, message: 'No record found'})
        }
  
  //console.log("today Month", month);
        try {
          //const notifyDetailsRead = await Notification.find({alert_user_id: myId, alert_status: 1 })
          const notifyDetailsRead = await Notification.find({alert_user_id: myId, alert_status: 1 })
          if(notifyDetailsRead){
            const updateDoc = {
              $set: {
                alert_status: 0,
                },
            }
            const updateRead = await Notification.updateMany(filter, updateDoc);
          }
          const notifyDetails = await Notification.find({alert_user_id: myId })
          .sort({alert_date: -1 })
          .skip(skip)
          .limit(itemsPerPage);
          
          //console.log(" Total Records is: ", countAll);
          if(!notifyDetails || notifyDetails < 1){
            return res.json({status: 404, message: 'No more records'})
          }
          if(notifyDetails){
            //console.log("Notification Details ", notifyDetails)
          //res.status(200).send(notifyDetails);
            res.send(notifyDetails)
          }
          
        } catch (err) {
          res.status(500).json(err);
          console.log(err.message);
        }
    });

// count user notification Message Mobile here here..
router.get("/user_messageCount/:id", isAuth, async (req, res) => {
  let myId = req.params.id;
  //console.log("Request", req.params.id);
  try {
    const messageDetailsCount = await Notification.find({alert_user_id: myId, alert_status: 1 })
    .count();
    if(!messageDetailsCount){
      //return res.status(404).send({msg: '404'});
      return res.json({status: 404, msg: 'No message found'})
    }
    else if(messageDetailsCount){
      //console.log("Total Notification Details ", messageDetailsCount)
      res.send({ msg: '200', userMessage: messageDetailsCount})
    }
    else{
      console.log("No message ")
    }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get current business selling/buying rate Mobile here here..
router.get("/current_rate", isAuth, async (req, res) => {
  try {
    const allRate = await GetRate.findOne({active: 'true'});
    if(!allRate){
      return res.json({status: 404, msg: '404'})
    }
    else if(allRate){
     // console.log("Rate Details ", allRate)
      res.send(allRate)
    }
    else{
      console.log("No message ")
    }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get user notification here here..
router.get("/user_notification/:id", async (req, res) => {
  let myId = req.params.id;
  var today = new Date();
  var month = today.toLocaleString('default', { month: 'long' });
  
  //console.log("today Month", month);
  try {
    const notifyDetails = await Notification.find({alert_user_id: myId, alert_status: 1 })
    .sort({ createdOn: -1 }).limit(4);
    if(!notifyDetails){
      return res.status(404).send({msg: '404'});
    }
    else if(notifyDetails){
    //console.log("Notification Details ", notifyDetails)
    res.status(200).send(notifyDetails);
    }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});
// mark user notification read here..
 router.get("/user_notification_read/:id", async (req, res) => {
  let myId = req.params.id;
  var today = new Date();
  var month = today.toLocaleString('default', { month: 'long' });
  const filter = {alert_user_id: myId, alert_status: 1}
  //console.log("today Month", month);
  try {
    const notifyDetailsRead = await Notification.find({alert_user_id: myId, alert_status: 1 })
    .sort({ createdOn: -1 });
    if(!notifyDetailsRead){
      console.log("Notification Not Found")
    }
    else if(notifyDetailsRead){
      const updateDoc = {
        $set: {
          alert_status: 0,
          },
      }
      const updateRead = await Notification.updateMany(filter, updateDoc);
      //console.log("Notification Read ", updateRead)
      res.status(200).send({msg: '200', updateRead});
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// admin request routes goes here
// count all users and show in dashboard here..
router.get("/all-users", verifyToken, async (req, res) => {
  try {
    const userDetails = await User.find().select('-password');
    
    if (!userDetails) {
      console.log("ERROR :: No record found");
      res.status(404).send({ msg: "404" });
      // student record failed to create
    } else {
      res.status(200).send({msg: '200', data: userDetails});
      //console.log("Data :: found", officerDetails);
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all admin users details/profile here..
router.get("/admin_users", verifyToken, async (req, res) => {
  try {
    const adminUserDetails = await User.find({user_role: 'Admin'}).select('-password');
    if(adminUserDetails){
      res.status(200).send({msg: '200', data: adminUserDetails});
    }
    else{  
    }
    } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all users logs details with pagination here..
router.get("/user_logs", verifyToken, async (req, res) => {
  const page = req.query.page;
  //const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const all_logs = await UserLog.find().sort({ createdOn: -1 })
    .skip(skip).limit(limit);
    //.sort({field_name: sort order})
    const totalItems = await UserLog.countDocuments();
    res.status(200).send({msg:'200', data: all_logs, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all users system activities logs details with pagination here..
router.get("/user_system_logs", verifyToken, async (req, res) => {
  const page = req.query.page;
  //const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const all_SystemLogs = await UserSystemLog.find().sort({ createdOn: -1 })
    .skip(skip).limit(limit);
    //.sort({field_name: sort order})
    const totalItems = await UserSystemLog.countDocuments();
    res.status(200).send({msg: '200', data: all_SystemLogs, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// delete system logs activities details here..
router.delete("/system_logs_delete/:id", async (req, res) => {
  let myId = req.params.id;
  //console.log("Delete ID", req.params.id);
   try {
    // find record by the post ID
    const queryLogs = await UserSystemLog.findOne({_id: req.params.id});
    //console.log("User Details", query);
    if(!queryLogs || queryLogs==null) {
     return res.status(403).send({ msg: "403" }); // No ID found
    }
    // delete the record found here
    const DeleteLogs = await UserSystemLog.deleteOne(queryLogs);

    if (DeleteLogs.deletedCount ===1) {
     
      res.status(200).send({ msg: "200" });
      
    } else {
      res.status(404).send({ msg: "404" });
      console.log("No record deleted.");
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});
// update bank officer profile details here..
router.post("/system_setup", upload.single("file"), async (req, res) => {
  //console.log("body data", req.body);
  const file = req.file;
  let imageUrl = '';

  //console.log("body data", req.body);
  try {
    const findUser = await User.findOne({_id: req.body.user_id})

    const checkSystem = await AppSetting.find().count(); // here I am checking if user exist then I will get user details
    //console.log("database data ", checkSystem)
       if(file && checkSystem != 0){
        const imageUrl = "/images/" + file.filename;
          const updateDoc = {
            $set: {
              app_name: req.body.business_name,
              app_short_name: req.body.business_short_name,
              app_logo: imageUrl,
              createdBy: req.body.user_id,
              },
          }
          const result = await AppSetting.updateOne(updateDoc);
           // create log here
           const addLogs = await SystemActivity.create({
            log_username: findUser.username,
            log_name: findUser.username+' '+ findUser.first_name,
            log_acct_number: '',
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Updated system application details',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Application details updated',
           })
         return res.status(200).send({msg: "200"});
              //console.log("User details: ", checkUser)
              //return res.status(404).send({ msg: '404' }); // Investment is already running
            }
       
       else if(!file && checkSystem != 0){
          const updateDoc = {
            $set: {
              app_name: req.body.business_name,
              app_short_name: req.body.business_short_name,
              createdBy: req.body.user_id,
              },
          }
          const result = await AppSetting.updateOne(updateDoc);
           // create log here
           const addLogs = await SystemActivity.create({
            log_username: findUser.username,
            log_name: findUser.username+' '+ findUser.first_name,
            log_acct_number: '',
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Updated system application details',
            log_amt: '',
            log_status: 'Successful',
            log_nature:'Application details updated',
           })
         return res.status(200).send({msg: "200"});
              //console.log("User details: ", checkUser)
              //return res.status(404).send({ msg: '404' }); // Investment is already running
            }
       
    else if(checkSystem == null || checkSystem == undefined || checkSystem == 0 && !file) {
     
        const officerData = await AppSetting.create({
          app_name: req.body.business_name,
          app_short_name: req.body.business_short_name,
          app_logo: '',
          createdBy: req.body.user_id,
          })
    saveRecord = await officerData.save();
    res.status(200).send({msg: "200"});
  } else if(checkSystem == null || checkSystem == undefined || checkSystem == 0 && file) {

        const imageUrl = "/images/" + file.filename;
        const officerData = await AppSetting.create({
          app_name: req.body.business_name,
          app_short_name: req.body.business_short_name,
          app_logo: imageUrl,
          createdBy: req.body.user_id,
          })
    saveRecord = await officerData.save();
    res.status(200).send({msg: "200"});
  }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

  module.exports = router;