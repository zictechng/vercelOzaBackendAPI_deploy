 const express = require('express');
const router = express.Router()
const jwt = require("jsonwebtoken");

const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

const multer = require("multer");

const nodemailer = require("nodemailer");

const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');
const Officer = require('../models/accountOfficer');
const Ticket = require('../models/ticketData');
const Investment = require('../models/investPlan');
const AngroPlan = require('../models/AgroInvestPlans')
const StockPlan = require('../models/StockInvestPlans')
const FXPlan = require('../models/FxInvestPlans')
const InvestorEarnings = require('../models/InvestorsEarning')
const UserLog = require('../models/UserLogs')
const UserSystemLog = require('../models/SystemActivityLogs')

const SystemActivity = require('../models/SystemActivityLogs');
const Notification = require('../models/NotificationAlert');
const AppSetting = require('../models/AppSettingDetails');

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
// get login use details via Mobile 
router.get("/profileMobile/:id", async (req, res) => {
    let userId = req.params.id;
    try {
      const userDetails = await User.findOne({ _id: userId });
     const { password, ...others } = userDetails._doc; // this will remove password from the details send to server.
  
     res.send({ msg: '200', userData: others})
    } catch (err) {
      res.status(500).json(err.message);
      console.log(err.message);
    }
  });
  
  // get current user financial details here..
  router.get("/income_details/:id", async (req, res) => {
    let userId = req.params.id;
    try {
      const userTransacPending = await TransferFund.aggregate([
        { $match: { createdBy: userId } },
        { $sort: { amount: -1 } },
        { $group: { _id: "$transac_nature", totalAmount: { $sum: "$amount" } } },
      ]);
      res.status(200).send(userTransacPending);
    } catch (err) {
      res.status(500).json(err.message);
      console.log(err.message);
    }
  });

  // get recent transaction of the user financial details here..
  router.get("/recent_transactions/:id", async (req, res) => {
    let userId = req.params.id;
    //console.log("Recent record ", userId);
    try {
      const recentTransaction = await TransferFund.find({createdBy: userId})
      .sort({ creditOn: -1 }).limit(6);
      res.send(recentTransaction)
      //res.json({status: 201, message: ' Login Successful'})
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
    const itemsPerPage = 10; // Number of transactions per page
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

    router.get("/all_historyMobile/:id", async (req, res) => {
      const userId = req.params.id;
      const itemsPerPage = 10; // Number of transactions per page
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
router.get("/history-wallet/:id", async (req, res) => {
    let userId = req.params.id;
    //console.log(userId);
    try {
      const walletStatement = await TransferFund.find({ createdBy: userId })
        .sort({ creditOn: -1 })
        .limit(5);
      //const totalItems =  await TransferFund.countDocuments()
      res.status(200).send(walletStatement);
      //console.log(walletStatement);
    } catch (err) {
      res.status(500).json(err);
      console.log(err.message);
    }
  });

// get user account statement financial record here..
router.get("/user_acct_statement", verifyToken, async (req, res) => {
  const page = req.query.page;
  const userId = req.query.id;
  //console.log("my ID", userId);
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const accountStatement = await TransferFund.find({createdBy: req.query.id})
    .sort({ creditOn: -1 })
    .skip(skip).limit(limit);

    //console.log("Record", accountStatement);

    const totalItems = await TransferFund.countDocuments({createdBy: req.query.id});
    if(accountStatement){
      res.status(200).send({msg: "200", data: accountStatement, total_record: totalItems});
    }
    else if(!accountStatement){
      res.status(200).send({msg: "404"});
    }
   
  } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});

// get user account statement financial record here..
// router.get("/user_acct_statement", async (req, res) => {
//   let page = req.query.page;
//   let limit = req.query.pageSize;
//   console.log(page, limit);
//   try {
//     if (req.query.page && req.query.pageSize) {
//       const statementPaginate = await TransferFund.paginate(
//         {},
//         { page: page, limit: limit }
//       );
//       res.status(200).send(statementPaginate);
//       console.log("All Data", statementPaginate);
//     } else {
//       const statementPaginate = await TransferFund.find();
//       res.status(200).send({data: statementPaginate});
//     }
//   } catch (error) {
//     res.status(400).json({
//       message: "An error occured: " + error,
//       error,
//     });
//   }
// });
// get user account statement financial record here..
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

// get user account history record here..
router.get("/user_tran_history", verifyToken, async (req, res) => {
  
  const page = req.query.page;
  const userId = req.query.id;
  //console.log("my ID", userId);
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  //console.log(limit, page);
  try {
    const acctStatement = await TransferFund.find({ createdBy: userId })
      .sort({ creditOn: -1 })
      .skip(skip).limit(limit);
    const totalItems = await TransferFund.countDocuments({createdBy: userId});
    if(!acctStatement){
      return res.status(401).json({msg: '401'});
    }
    else{
      res.status(200).send({msg: '200', data: acctStatement, total_record: totalItems });
      // console.log(acctStatement, totalItems);  
    }
    } catch (err) {
    res.status(500).json(err);
    console.log("History Page Error ", err.message);
  }
});


// user request route to block their account goes here...
router.post("/block_user_acct", async (req, res) => {
  const userId = req.body;
  console.log("My Blocked ID: ", req.body)
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
              const userLogs = Notification.create({
                alert_username: userDetails.username,
                alert_name: userDetails.surname + ' ' + userDetails.first_name,
                alert_user_ip: '',
                alert_country: '',
                alert_browser: '',
                alert_date:  Date.now(),
                alert_user_id: userDetails._id,
                alert_nature: 'Your account was currently blocked! contact admin for support and unlocked the account',
                alert_status: 1,
                alert_read_date: ''
            })
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

// get account officer details/profile here..
router.get("/officer_details", verifyToken, async (req, res) => {
  try {
    const officerDetails = await Officer.find();
    if (!officerDetails) {
      res.status(404).send({ msg: "404" });
      // student record failed to create
    } else {
      res.status(200).send({msg: '200', data: officerDetails});
      //console.log("Data :: found", officerDetails);
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});
  
// get account officer details/profile here..
router.post("/add_officer", verifyToken, async (req, res) => {
    //console.log("Backend Data", req.body)
    try {
      let officerUsername = await Officer.findOne({ username:  req.body.username }); // here I am checking if user exist then I will get user details
      if (officerUsername) {
        //console.log("User details: ", userDetails)
        res.status(404).send({ msg: '404' }); // username exists
      } 
      else if (!officerUsername){
    
        const user = await Officer.create(req.body)
        res.status(200).send({ msg: "200" });
     }
  } catch (err) {
  res.status(500).send({ msg: "500" });
}

});

// get account officer details/profile here..
router.post("/submit_ticket", verifyToken, async (req, res) => {
   //console.log("Backend Data", req.body)

    try {
      let checkUser = await User.findOne({ _id:  req.body.createdBy }); // here I am checking if user exist then I will get user details
      if (!checkUser) {
        //console.log("User details: ", userDetails)
        return res.status(404).send({ msg: '404' }); // user not exists
      } 
      else if (checkUser){
    
        const sumbitTicket = await Ticket.create(req.body)
          // create log here
       const addLogs = await SystemActivity.create({
        log_username: checkUser.username,
        log_name: checkUser.surname+' '+checkUser.first_name,
        log_acct_number: checkUser.acct_number,
        log_receiver_name: '',
        log_receiver_number:'',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Created support ticket details',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Ticket created',
       });
       const userLogs = Notification.create({
        alert_username: checkUser.username,
        alert_name: checkUser.surname + ' ' + checkUser.first_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: checkUser._id,
        alert_nature: 'You created a ticket for support! If you did not receive any feedback, please be patient',
        alert_status: 1,
        alert_read_date: ''
    });
    
    // email notification sending
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
        to: checkUser.email, // list of receivers
        subject: "Open Ticket for Support", // Subject line
        text: `Hello ${checkUser.first_name}, this is to notify you that your was submitted successfully, your account officer will get in-touch thank you.`,
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
                                    <h2 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                    Open Ticket For Support
                                    </h2>
                                </td>
                            </tr>
                            <tr>
                                <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                    <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                    Hello ${checkUser.first_name}, this is to notify you that your support ticket was submitted successfully, we will get in-touch shortly thank you.
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
                                       Please, contact support for any other information about any query.
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
      if(main()){
          //console.log('Login email sent successfully');
      } else{
          console.log('Email not send');
      }
    res.status(200).send({ msg: "200" });
     }
  } catch (err) {
  res.status(500).send({ msg: "500" });
}

});


// Block user account status from mobile app here..
router.post("/block_AccountMobile", async (req, res) => {
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
          acct_status: 'Deactivated',
          },
      }
      const updateRead = await User.updateOne(filter, updateDoc);
      if(updateRead){
        const addLogs = await SystemActivity.create({
          log_username: checkUser.username,
          log_name: checkUser.surname+' '+checkUser.first_name,
          log_acct_number: checkUser.acct_number,
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
         const userLogs = Notification.create({
          alert_username: checkUser.username,
          alert_name: checkUser.surname + ' ' + checkUser.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: checkUser._id,
          alert_nature: 'User requested for account blocking for some reasons',
          alert_status: 1,
          alert_read_date: ''
      });

      // email notification sending
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
        to: checkUser.email, // list of receivers
        subject: 'Account security',
        text: `Hello ${checkUser.first_name}, this is to notify you that your request was submitted successfully, your account has been blocked.`,
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
                                              <h2 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                              Open Ticket For Support
                                              </h2>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                              <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                              Hello ${checkUser.first_name}, this is to notify you that your support ticket was submitted successfully, we will get in-touch shortly thank you.
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
                                                 Please, contact support for any other information about any query.
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
      if(main()){
          //console.log('Login email sent successfully');
      } else{
          console.log('Email not send');
      }
         
      //res.status(200).send({ msg: "200" });
      res.send({ msg: '200'})
      }
         
    }
 } catch (err) {
 res.status(500).send({ msg: "500" });
}

});

// Block user account status from mobile app here..
router.post("/reset_AccountPINMobile", async (req, res) => {
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
          log_username: checkUser.username,
          log_name: checkUser.surname+' '+checkUser.first_name,
          log_acct_number: checkUser.acct_number,
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
         const userLogs = Notification.create({
          alert_username: checkUser.username,
          alert_name: checkUser.surname + ' ' + checkUser.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: checkUser._id,
          alert_nature: 'User requested for account pin change for some reasons',
          alert_status: 1,
          alert_read_date: ''
      });

      // email notification sending
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
        to: checkUser.email, // list of receivers
        subject: 'Account security',
        text: `Hello ${checkUser.first_name}, this is to notify you that your request was submitted successfully, your account PIN been updated.`,
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
                                              <h2 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                              Open Ticket For Support
                                              </h2>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                              <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                              Hello ${checkUser.first_name}, this is to notify you that your support ticket was submitted successfully, we will get in-touch shortly thank you.
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
                                                 Please, contact support for any other information about any query.
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
      if(main()){
          //console.log('Login email sent successfully');
      } else{
          console.log('Email not send');
      }
     //res.status(200).send({ msg: "200" });
      res.send({ msg: '200'})
      }
         
    }
 } catch (err) {
 res.status(500).send({ msg: "500" });
}

});

// Block user account status from mobile app here..
router.post("/fetch_AccountDetailsMobile", async (req, res) => {
  //console.log("Backend Data receive ", req.body)
  const filter = { _id: req.body.uid };

   try {
     let checkUser = await User.findOne({ acct_number:  req.body.data }); // here I am checking if user exist then I will get user details
     if (!checkUser) {
       //console.log("User details: ", userDetails)
      return res.json({status: 404, message: ' No user found'})
     } 
     else if (checkUser){
      // set deactivation status here ...
      
      const { password, ...others } = checkUser._doc;
      res.send({ msg: '200', userData: others})
         
    }
 } catch (err) {
 res.status(500).send({ msg: "500" });
}

});


// submit ticket details from mobile app here..
router.post("/submit_ticketMobile", async (req, res) => {
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
       log_username: checkUser.username,
       log_name: checkUser.surname+' '+checkUser.first_name,
       log_acct_number: checkUser.acct_number,
       log_receiver_name: '',
       log_receiver_number:'',
       log_receiver_bank: '',
       log_country: '',
       log_swift_code: '',
       log_desc:'Created support ticket details',
       log_amt: '',
       log_status: 'Successful',
       log_nature:'Ticket created',
      });
      const userLogs = Notification.create({
       alert_username: checkUser.username,
       alert_name: checkUser.surname + ' ' + checkUser.first_name,
       alert_user_ip: '',
       alert_country: '',
       alert_browser: '',
       alert_date:  Date.now(),
       alert_user_id: checkUser._id,
       alert_nature: 'You created a ticket for support! If you did not receive any feedback, please be patient',
       alert_status: 1,
       alert_read_date: ''
   });

   // email notification sending
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
      to: checkUser.email, // list of receivers
      subject: 'Open Ticket for Support',
      text: `Hello ${checkUser.first_name}, this is to notify you that your was submitted successfully, your account officer will get in-touch thank you.`,
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
                                  <h2 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                  Open Ticket For Support
                                  </h2>
                              </td>
                          </tr>
                          <tr>
                              <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                  <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                  Hello ${checkUser.first_name}, this is to notify you that your support ticket was submitted successfully, we will get in-touch shortly thank you.
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
                                     Please, contact support for any other information about any query.
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
    if(main()){
        //console.log('Login email sent successfully');
    } else{
        console.log('Email not send');
    }
   
    //res.status(200).send({ msg: "200" });
   res.send({ msg: '200'})
    }
 } catch (err) {
 res.status(500).send({ msg: "500" });
}

});

// process invest plan request details here..
router.post("/submit_investment", verifyToken, async (req, res) => {
  //sconsole.log("Backend Data", req.body)
 // res.status(200).send({ msg: "200" });
      try {
        let checkUser = await Investment.findOne({ createdBy:  req.body.createdBy }); // here I am checking if user exist then I will get user details
        if (checkUser) {
          //console.log("User details: ", userDetails)
          return res.status(401).send({ msg: '401' }); // Investment is already running
        } 
        else if (!checkUser){
      
          const sumbitTicket = await Investment.create(req.body)
           // create log here
           const addLogs = await SystemActivity.create({
            log_username: req.body.username,
            log_name: req.body.sender_name,
            log_acct_number: req.body.email,
            log_receiver_name: '',
            log_receiver_number: '',
            log_receiver_bank: '',
            log_country: '',
            log_swift_code: '',
            log_desc:'Investment processing submitted',
            log_amt: request.body.invest_amt,
            log_status: 'Successful',
            log_nature:'Submitted investment',
           });

           const userLogs = Notification.create({
            alert_username: req.body.username,
            alert_name: req.body.sender_name,
            alert_user_ip: '',
            alert_country: '',
            alert_browser: '',
            alert_date:  Date.now(),
            alert_user_id: req.body.createdBy,
            alert_nature: 'You submitted application for an investment package! If you did not receive any feedback, please contact support',
            alert_status: 1,
            alert_read_date: ''
        })
          res.status(200).send({ msg: "200" });
      }
      // const sumbitTicket = await Investment.create(req.body)
      //  res.status(200).send({ msg: "200" });
    } catch (err) {
      res.status(500).send({ msg: "500" });
    }

  });

  // get finance charts details here..
router.get("/user_finance_chart/:id", async (req, res) => {
  let myId = req.params.id;
  
  //console.log("User ID", req.params.id);
  // Getting full month name (e.g. "June")
  var today = new Date();
  var month = today.toLocaleString('default', { month: 'long' });
  
  //console.log("today Month", month);
  try {
    const chartStatement = await TransferFund.find({createdBy: myId })
    .sort({ createdOn: -1 });

    const chartStatementGroup = await TransferFund. aggregate([
      { $match: { createdBy: myId } },
      { $group: { _id: "$transac_nature", amount: { $sum: "$amount" }} },
    ]);

   
    //console.log("Chart Details ", chartStatementGroup)
    res.status(200).send({resultData: chartStatement, data:chartStatementGroup});
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

 // get user notification from Mobile here here..
 router.get("/user_notificationMobile/:id", async (req, res) => {
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
    .sort({ createdOn: -1 })
    .skip(skip)
    .limit(itemsPerPage);
    
    //console.log(" Total Records is: ", countAll);
    if(!notifyDetails || notifyDetails < 1){
      return res.json({status: 404, message: 'No more records'})
    }
    else if(notifyDetails){
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
router.get("/user_messageCount/:id", async (req, res) => {
  let myId = req.params.id;
  console.log("Request", req.params.id);
  try {
    const messageDetailsCount = await Notification.find({alert_user_id: myId, alert_status: 1 })
    .count();
    if(!messageDetailsCount){
      //return res.status(404).send({msg: '404'});
      return res.json({status: 404, msg: 'No message found'})
    }
    else if(messageDetailsCount){
      console.log("Total Notification Details ", messageDetailsCount)
      //res.send(messageDetailsCount)
      //res.sendStatus(200).send(messageDetailsCount);
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

// get all active users details/profile here..
router.get("/active-users", async (req, res) => {
  try {
    const activeUserDetails = await User.find({acct_status: 'Active'});
    //pending user goes here
    const pendingUserDetails = await User.find({acct_status: 'Pending'});
    //blocked users goes here
    const blockedUserDetails = await User.find({acct_status: 'Blocked'});
    if (!activeUserDetails) {
      console.log("ERROR :: No record found");
      res.status(404).send({ msg: "404" });
      // student record failed to create
    } else {
      res.status(200).send({data: activeUserDetails, 
        blocked: blockedUserDetails, pending: pendingUserDetails});
     // console.log("Data :: found", activeUserDetails);
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all active users details/profile here..
router.get("/users-transactions", verifyToken, async (req, res) => {
  try {
    const UserTransaction = await TransferFund.find();
    const limitUserTransaction = await TransferFund.find().sort({creditOn: -1}).limit(5);
    if (!UserTransaction) {
      console.log("ERROR :: No record found");
      res.status(404).send({ msg: "404" });
      // student record failed to create
    } else {
      res.status(200).send({msg: '200', data: UserTransaction, recent: limitUserTransaction});
      //console.log("Data :: found", UserTransaction);
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all users investment details here..
router.get("/users-investments", verifyToken, async (req, res) => {
  try {
    const UserInvestment = await Investment.find();
    if (!UserInvestment) {
      console.log("ERROR :: No record found");
      res.status(404).send({ msg: "404" });
      // student record failed to create
    } else {
      res.status(200).send({msg: '200d', ata: UserInvestment});
      //console.log("Data :: found", UserTransaction);
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all users details with pagination here..
router.get("/user-details", verifyToken, async (req, res) => {
  const page = req.query.page;
  const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const allUsers = await User.find({user_role: "User", acct_status: "Active"}).sort({ createdOn: -1 })
    .skip(skip).limit(limit);
    //.sort({field_name: sort order})
    
    const totalItems = await User.countDocuments();
    res.status(200).send({msg:'200', data: allUsers, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all pending users details with pagination here..
router.get("/pending_users", verifyToken, async (req, res) => {
  const page = req.query.page;
  //const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const allUsers = await User.find({acct_status: 'Pending', user_role: "User"}).sort({ createdOn: -1 })
    .skip(skip).limit(limit).select('-password');
    
    //.sort({field_name: sort order})
    //console.log("result Data", allUsers)
    const totalItems = await User.countDocuments();
    res.status(200).send({msg:'200', data: allUsers, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all users transaction details with pagination here..
router.get("/user_tran", verifyToken, async (req, res) => {
  const page = req.query.page;
  //const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const allTrans = await TransferFund.find().sort({ creditOn: -1 })
    .skip(skip).limit(limit);
    //.sort({field_name: sort order})
    
    const totalItems = await TransferFund.countDocuments();
    res.status(200).send({msg:'200', data: allTrans, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

 // fetch user details to show in the edit form here..
 router.get("/fetch_edit_user/:id", async (req, res) => {
  let myId = req.params.id;
  
  //console.log("Edit User ID", req.params.id);
  // Getting full month name (e.g. "June")
  var today = new Date();
  var month = today.toLocaleString('default', { month: 'long' });
  
  //console.log("today Month", month);
  try {
    const userData = await User.find({_id: myId });
    //console.log("Chart Details ", chartStatement)
    res.status(200).send({data:userData});
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// delete user details here..
 router.delete("/delete_user_details/:id", async (req, res) => {
  let myId = req.params.id;
  //console.log("Delete ID", req.params.id);
   try {
    // find record by the post ID
    const query = await User.findOne({_id: req.params.id});
    //console.log("User Details", query);
    if(!query || query==null) {
     return res.status(403).send({ msg: "403" }); // No ID found
    }
    // delete the record found here
    const result = await User.deleteOne(query);

    if (result.deletedCount ===1) {
      res.status(200).send({ msg: "200" });
      //console.log("User delete Details", deleteUser )
    } else {
      res.status(404).send({ msg: "404" });
      console.log("No record deleted.");
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// delete transaction details here..
 router.delete("/delete_transactions/:id", async (req, res) => {
  let myId = req.params.id;
  //console.log("Delete ID", req.params.id);
   try {
    // find record by the post ID
    const query = await TransferFund.findOne({_id: req.params.id});
    //console.log("User Details", query);
    //console.log("User Details", query);
    if(!query || query==null) {
      return res.status(403).send({ msg: "403" }); // No ID found
    }
    // delete the record found here
    const deleteRecord = await TransferFund.deleteOne(query);

    if (deleteRecord.deletedCount === 1) {
      res.status(200).send({ msg: "200" });
    } else {
      res.status(404).send({ msg: "404" });
      console.log("No documents matched the query id.");
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// update angro plan investment details here..
router.post("/update_angro_invest", async (req, res) => {
  //console.log("body data", req.body);
  try {
    const findUser = await User.findOne({_id: req.body.user_id})
    //console.log("User Data", findUser)
    const checkUser = await AngroPlan.find().count(); // here I am checking if user exist then I will get user details
        //console.log("database data ", checkUser)
    if (checkUser != 0) {
      const updateDoc = {
        $set: {
          starter_plan: req.body.starter_amt,
          premier_plan: req.body.premier_amt,
          gold_plan: req.body.gold_amt,
        },
      }
      const result = await AngroPlan.updateOne(updateDoc);
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
        log_desc:'Updated angro investment ROI rate',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Updated angro investment',
       })
     return res.status(200).send({msg: "200"});
          //console.log("User details: ", checkUser)
          //return res.status(404).send({ msg: '404' }); // Investment is already running
        }
    else if(checkUser == null || checkUser == undefined || checkUser == 0) {
    const sumbitTicket = await AngroPlan.create({
      starter_plan: req.body.starter_amt,
      premier_plan: req.body.premier_amt,
      gold_plan: req.body.gold_amt,
    })
    saveRecord = await sumbitTicket.save();
     // create log here
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
        log_desc:'Updated angro investment processing submitted',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Updated angro investment',
       })
    res.status(200).send({msg: "200"});
  }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// update stock plan investment details here..
router.post("/update_stock_invest", async (req, res) => {
  const findUser = await User.findOne({_id: req.body.user_id})
 try {
    
    const checkUser = await StockPlan.find().count(); // here I am checking if user exist then I will get user details
     if (checkUser != 0) {
      const updateDoc = {
        $set: {
          starter_plan: req.body.starter_amt,
          premier_plan: req.body.premier_amt,
          gold_plan: req.body.gold_amt,
        },
      }
      const result = await StockPlan.updateOne(updateDoc);
       // create log here
        // create log here
        const addLogs = await SystemActivity.create({
          log_username: findUser.username,
          log_name: findUser.surname+' '+ findUser.first_name,
          log_acct_number: '',
          log_receiver_name: '',
          log_receiver_number: '',
          log_receiver_bank: '',
          log_country: '',
          log_swift_code: '',
          log_desc:'Updated stock investment ROI rate',
          log_amt: '',
          log_status: 'Successful',
          log_nature:'Updated stock investment',
         })
     return res.status(200).send({msg: "200"});
      }
    else if(checkUser == null || checkUser == undefined || checkUser == 0) {
    const sumbitTicket = await StockPlan.create({
      starter_plan: req.body.starter_amt,
      premier_plan: req.body.premier_amt,
      gold_plan: req.body.gold_amt,
    })
    saveRecord = await sumbitTicket.save();
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
        log_desc:'Updated angro investment processing submitted',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Updated angro investment',
       })
    res.status(200).send({msg: "200"});
  }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// update fx plan investment details here..
router.post("/update_fx_invest", verifyToken, async (req, res) => {
 try {
     const findUser = await User.findOne({_id: req.body.user_id})
    const checkUser = await FXPlan.find().count(); // here I am checking if user exist then I will get user details
     if (checkUser != 0) {
      const updateDoc = {
        $set: {
          starter_plan: req.body.starter_amt,
          premier_plan: req.body.premier_amt,
          gold_plan: req.body.gold_amt,
        },
      }
      const result = await FXPlan.updateOne(updateDoc);
        // create log here
        const addLogs = await SystemActivity.create({
          log_username: findUser.username,
          log_name: findUser.surname+' '+ findUser.first_name,
          log_acct_number: '',
          log_receiver_name: '',
          log_receiver_number: '',
          log_receiver_bank: '',
          log_country: '',
          log_swift_code: '',
          log_desc:'Updated FX investment ROI rate',
          log_amt: '',
          log_status: 'Successful',
          log_nature:'Updated FX investment',
         })
     return res.status(200).send({msg: "200"});
      }
    else if(checkUser == null || checkUser == undefined || checkUser == 0) {
    const sumbitTicket = await FXPlan.create({
      starter_plan: req.body.starter_amt,
      premier_plan: req.body.premier_amt,
      gold_plan: req.body.gold_amt,
    })
    saveRecord = await sumbitTicket.save();
       // create log here
       const addLogs = await SystemActivity.create({
        log_username: findUser.username,
        log_name: findUser.surname+' '+ findUser.first_name,
        log_acct_number: '',
        log_receiver_name: '',
        log_receiver_number: '',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Updated angro investment processing submitted',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Updated angro investment',
       })
    res.status(200).send({msg: "200"});
  }
    
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all investment plan investment by admin here..
router.get("/all_invest_plan", async (req, res) => {
 try {
      const get_fxPlans = await FXPlan.find(); // here I am checking if user exist then I will get user details
     
      const get_angPlan = await AngroPlan.find();

      const get_stockPlan = await StockPlan.find();

      res.status(200).send({msg: '200', "fx_data": get_fxPlans, "angro_data": get_angPlan, "stock_data": get_stockPlan});
     
      } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all investors details with pagination here..
router.get("/all_investors", verifyToken, async (req, res) => {
  const page = req.query.page;
  //const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const allInvestors = await Investment.find().sort({ createdOn: -1 })
    .skip(skip).limit(limit);
    //.sort({field_name: sort order})
    
    const totalItems = await Investment.countDocuments();
    res.status(200).send({msg: '200', data: allInvestors, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get all investors earning details with pagination here..
router.get("/investors_earnings", verifyToken, async (req, res) => {
  const page = req.query.page;
  //const userId = req.query.id;
  const limit = req.query.pageSize;
  const totalItems = 0;
  const skip = (page - 1) * limit;
  try {
    const allInvestors = await InvestorEarnings.find().sort({ createdOn: -1 })
    .skip(skip).limit(limit);
    //.sort({field_name: sort order})
    
    const totalItems = await InvestorEarnings.countDocuments();
    res.status(200).send({msg: '200', data: allInvestors, total_record: totalItems });

  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// get investment analysis details/profile here..
router.get("/investors_analysis", async (req, res) => {
  try {
    const angorUsersDetails = await Investment.find({investment_name: 'Angro Investment'});
    //pending user goes here
    const stockUsersUserDetails = await Investment.find({investment_name: 'Stock Investment'});
    //blocked users goes here
    const fxUserDetails = await Investment.find({investment_name: 'FX Investment'});
    
      res.status(200).send({data: angorUsersDetails, 
        "stock_investor": stockUsersUserDetails, "fx_investors": fxUserDetails});
     // console.log("Data :: found", activeUserDetails);
  } catch (err) {
    res.status(500).json(err);
    console.log(err.message);
  }
});

// delete investors details here..
router.delete("/delete_investors/:id", async (req, res) => {
  let myId = req.params.id;
  //console.log("Delete ID", req.params.id);
   try {
    // find record by the post ID
    const queryInvestor = await Investment.findOne({_id: req.params.id});
    //console.log("User Details", query);
    if(!queryInvestor || queryInvestor==null) {
     return res.status(403).send({ msg: "403" }); // No ID found
    }
    // delete the record found here
    const DeleteInvestor = await Investment.deleteOne(queryInvestor);

    if (DeleteInvestor.deletedCount ===1) {
      // create log here
      const addLogs = await SystemActivity.create({
        log_username: 'Amin',
        log_name: '',
        log_acct_number: '',
        log_receiver_name: '',
        log_receiver_number:'',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Delete investor user account details',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Admin delete account details',
       })
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

// approve investors investment details here..
router.delete("/approve_invest_investors/:id", verifyToken, async (req, res) => {
  let myId = req.params.id;
  const filter = { _id: req.params.id };
   try {
    // find record by the post ID
    const queryInvestor = await Investment.findOne({_id: req.params.id});
    //console.log("User Details", query);
    if(!queryInvestor || queryInvestor==null) {
     return res.status(403).send({ msg: "403" }); // No ID found
    }
    else if(queryInvestor){
      const updateDoc = {
        $set: {
          invest_status: "Approved",
          },
      }
      const DeleteInvestor = await Investment.updateOne(filter, updateDoc);
      if (DeleteInvestor.modifiedCount ===1) {
        // create log here
       const addLogs = await SystemActivity.create({
        log_username: 'Admin',
        log_name: '',
        log_acct_number: '',
        log_receiver_name: '',
        log_receiver_number:'',
        log_receiver_bank: '',
        log_country: '',
        log_swift_code: '',
        log_desc:'Approve user investment account details',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Admin approved investment details',
       });

       // Create notification for user
       const userLogs = Notification.create({
        alert_username: queryInvestor.username,
        alert_name: queryInvestor.sender_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: queryInvestor.createdBy,
        alert_nature: 'Your investment package was approved! You can contact admin for more details',
        alert_status: 1,
        alert_read_date: ''
    });

    // email notification sending
    const messageBody ={
      // to: checkUser.email,
      to: queryInvestor.email, // this will allowed you to add more email to receive notification
      // from: 'perrysmith562@gmail.com ',
      from:{
        name: 'Rugipo Alumni Finance',
        email: 'perrysmith562@gmail.com'
      },
      subject: 'Investment Approved',
      text: `Hello ${queryInvestor.sender_name}, this is to notify you that your has been approved, you can contact your account officer for more details, thank you.`,
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
                                  <h2 style="font-size: 20px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                  Investment Approved
                                  </h2>
                              </td>
                          </tr>
                          <tr>
                              <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                  <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                  Hello ${queryInvestor.sender_name}, this is to notify you that your has been approved, you can contact your account officer for more details, thank you.
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
                                     Please, contact support for any further details about our investment and support.
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
    };
      sgMail.send(messageBody).then((response) => console.log('Message Response ', response.message))
      .catch((err) => console.log(err.message));

        res.status(200).send({ msg: "200" });
        
      } else {
        res.status(404).send({ msg: "404" });
        console.log("No record deleted.");
      }
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
router.post("/update_officer", upload.single("file"), async (req, res) => {
  const file = req.file;
  const imageUrl = "/images/" + file.filename;

  console.log("body data", req.body);
  try {
    const findUser = await User.findOne({_id: req.body.user_id})

    const checkOfficer = await Officer.find().count(); // here I am checking if user exist then I will get user details
        //console.log("database data ", checkOfficer)
       
    if (checkOfficer != 0) {
      const updateDoc = {
        $set: {
          surname: req.body.surname,
          first_name: req.body.first_name,
          gender: req.body.gender,
          email: req.body.email,
          staff_type: req.body.office_type,
          staff_id: req.body.staff_id,
          username: req.body.username,
          branch: req.body.branch_office,
          image_photo: imageUrl,
          bank_name: req.body.bank_name,
          acct_status: req.body.acct_status,
        },
      }
      const result = await Officer.updateOne(updateDoc);
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
        log_desc:'Updated account officer details',
        log_amt: '',
        log_status: 'Successful',
        log_nature:'Account officer updated',
       })
     return res.status(200).send({msg: "200"});
          //console.log("User details: ", checkUser)
          //return res.status(404).send({ msg: '404' }); // Investment is already running
        }
    else if(checkOfficer == null || checkOfficer == undefined || checkOfficer == 0) {
    const officerData = await Officer.create({
          surname: req.body.surname,
          first_name: req.body.first_name,
          gender: req.body.gender,
          email: req.body.email,
          staff_type: req.body.office_type,
          staff_id: req.body.staff_id,
          username: req.body.username,
          branch: req.body.branch_office,
          image_photo: imageUrl,
          bank_name: req.body.bank_name,
          acct_status: req.body.acct_status,
    })
    saveRecord = await officerData.save();
    res.status(200).send({msg: "200"});
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