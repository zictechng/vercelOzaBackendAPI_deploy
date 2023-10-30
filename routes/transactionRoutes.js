const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const currencyFormatter = require('currency-formatter');

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');
const Investment = require('../models/investPlan')

const InvestorsCreditAccount = require('../models/InvestorsEarning');

const SystemActivity = require('../models/SystemActivityLogs');
const Notification = require('../models/NotificationAlert');

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

// all transaction routes goes here...

// wire transfer routes goes here...
router.post("/wire_transfer_funds", verifyToken, async (req, res) => {
    let fundData = req.body;
    //console.log("User details",  req.body);
    
    const userId = req.body.createdBy;
    const amt_send = req.body.send_amt;
    
    try {
      // let sendFund;
      let userDetails = await User.findOne({ _id: userId }); // where I am checking if user exist the I will get user details
      //  console.log(`${userDetails.name}`); // is showing undefine.
      let fundsend = new TransferFund({
        acct_name: req.body.holder_name,
        acct_number: req.body.acct_number,
        swift_code: req.body.swift_code,
        amount: req.body.send_amt,
        bank_name: req.body.bank_name,
        bank_address: req.body.address,
        sender_name: userDetails.surname+' '+userDetails.first_name,
        tran_type: 'Transfer',
        transac_nature: 'Debit',
        tran_desc: 'Wire bank transfer',
        createdBy: userId,
        tid: req.body.tid,
        tr_year: req.body.tr_year,
        tr_month: req.body.tr_month,
        sender_currency_type: userDetails.currency_type,
        sender_acct_number: userDetails.acct_number,
        colorcode: 'red',
    });
      if (!userDetails) {
        res.status(402).send({ msg: "402" });
        //console.log("User not fund!"); // user account not found then show error
      } else if (
        userDetails.acct_status == "Pending" ||
        userDetails.acct_status == null
      ) {
        res.status(403).send({ msg: "403" });
        // user account status is not active
      } else if (userDetails.amount == "" || userDetails.amount < amt_send) {
        res.status(405).send({ msg: "405" }); // user account balance is low
      } else if (userDetails) {
        
        sendFund = await fundsend.save();
        // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.surname+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: req.body.holder_name,
        log_receiver_number: req.body.acct_number,
        log_receiver_bank: req.body.bank_name,
        log_country: '',
        log_swift_code: req.body.swift_code,
        log_desc:'Initiated wire fund transfer details',
        log_amt: req.body.send_amt,
        log_status: 'Successful',
        log_nature:'Wire transfer details',
       });

       // create notification for user 
       const userLogs = Notification.create({
        alert_username: userDetails.username,
        alert_name: userDetails.username+' '+userDetails.first_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: userDetails._id,
        alert_nature: 'Your wire fund transfer initiated! Complete the process for a successful wire fund transfer',
        alert_status: 1,
        alert_read_date: ''
    })
        res.status(200).send({ msg: "200", sendFund });
      }
  
      //fundsend.createdBy = (User._id); // get current user ID
    } catch (err) {
      res.status(500).send({ msg: "500" });
      console.error("Error occurred", err);
    }
  }); 
  
  // wire transfer pin confirm routes goes here...
router.post("/confirm_pin", verifyToken, async (req, res, next) => {
    const userId = req.body.createdBy;
   // console.log("PIN: ", req.body.createdBy)
    // get the transfer record ID here
    const filter = { tid: req.body.tran_id };
    try {
      if (req.body.pin_code == "" || req.body.pin_code == null) {
       return res.status(404).send({ msg: "404" }); // cot code required
       }
     
       let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
     
       if (!userDetails) {
        res.status(402).send({ msg: '402' });
      } 
      else if (userDetails){

       if (userDetails.acct_pin == "" || userDetails.acct_pin == null) {
          res.status(403).json({ msg: "403" }); // user account pin not found
          //console.log("Pin empty: ", res.status)
        }
        else if (userDetails.acct_pin != req.body.pin_code) {
          res.status(406).send({ msg: "406" }); // invalid pin entered
        } 
        else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
          res.status(401).send({ msg: "401" }); // account is blocked
        } 
        else if (userDetails.acct_pin == req.body.pin_code) {
            //update single record transfer status collection here
            //console.log("Pin was found: ", res)
            const updateDoc = {
              $set: {
                transaction_status: "Pin validated",
              },
            }
            const result = await TransferFund.updateOne(filter, updateDoc);
             // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: req.body.holder_name,
        log_receiver_number: req.body.acct_number,
        log_receiver_bank: req.body.bank_name,
        log_country: '',
        log_swift_code: req.body.swift_code,
        log_desc:'Wire fund transfer PIN Entered',
        log_amt: req.body.send_amt,
        log_status: 'Successful',
        log_nature:'PIN confirmed',
       });

        // create notification for user 
        const userLogs = Notification.create({
          alert_username: userDetails.username,
          alert_name: userDetails.username+' '+userDetails.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: userDetails._id,
          alert_nature: 'Your wire fund transfer PIN validate! Complete the process for a successful wire fund transfer',
          alert_status: 1,
          alert_read_date: ''
      })
            res.status(201).send({ msg: "201" });
          }
       }
      
      } catch (err) {
      res.status(500).send({ msg: "500" });
    }
  });
  

  // confirm pin from mobile app here..
router.post("/confirm_pinMobile", async (req, res) => {
    //console.log("Backend Data receive ", req.body)
    const numberWithoutCommas = req.body.local_amount.replace(/,/g, '');
    //console.log('Amount ', numberWithoutCommas)
    const sendAmount = req.body.local_amount
    const userId = req.body.createdBy;
    const amt_send = numberWithoutCommas;
    const filter = { _id: req.body.createdBy };

    try {
            let userDetails = await User.findOne({ _id: userId });
            let receiverUserDetails = await User.findOne({ acct_number: req.body.localAccount_number });
            
            if (!userDetails) {
                return res.json({status: 402, message: ' No user found'});
            } 
            if (userDetails.acct_pin == "" || userDetails.acct_pin == null) {
                return res.json({status: 403, message: ' No user account pin found'}); // user account pin not found
            }
            if (userDetails.acct_pin != req.body.pin_code) {
                return res.json({status: 406, message: ' Invalid pin'}); // invalid pin entered
              } 
            if (userDetails.amount == "" || userDetails.amount < amt_send) {
                return res.json({status: 400, message: ' Low balance'}); // user account balance is low
              }
            else{
                let oldTotal = parseFloat(userDetails.amount);
                let newTotal = parseFloat(amt_send);

                const curBalance = (oldTotal - newTotal);
                
                // run receiver notification here 
                if(receiverUserDetails){
                    let b = parseFloat(receiverUserDetails.amount);
                    let c = parseFloat(amt_send);
                    var receiverCurBalance = parseFloat(b + c);
                    //const totalAmount = receiverCurBalance += amt_send;
                    const filterReceiver = {_id: receiverUserDetails._id}
                    const updateReceiverDocBalance = {
                    $set: {
                    amount: receiverCurBalance,
                    last_transaction: amt_send,
                        },
                    };
                const result_bal = await User.updateOne(filterReceiver, updateReceiverDocBalance);
                 //receiver statement here
                    const receiverStatementLogs = TransferFund.create({
                        acct_name: req.body.localAccount_name,
                        acct_number: req.body.localAccount_number,
                        amount: amt_send,
                        bank_name: req.body.localBank_name,
                        bank_address: req.body.localBank_address,
                        sender_name: userDetails.surname+' '+userDetails.first_name,
                        tran_type: 'Transfer',
                        transac_nature: 'Credit',
                        tran_desc: req.body.localBank_address ? req.body.localBank_address : 'Local bank transfer',
                        trans_balance: receiverCurBalance,
                        createdBy: receiverUserDetails._id,
                        tid: req.body.tid_record,
                        tr_year: req.body.year,
                        tr_month: req.body.month,
                        transaction_status: 'Successful',
                        colorcode:'green',
                        sender_currency_type: receiverUserDetails.currency_type,
                        sender_acct_number: userDetails.acct_number,
                    });
                }
                //console.log('Total Balance: ' + receiverCurBalance)
                // update user current balance here
                const updateDocBalance = {
                $set: {
                amount: curBalance,
                last_transaction: amt_send,
                    },
                };
                const result_bal = await User.updateOne(filter, updateDocBalance);
                let fundsend = new TransferFund({
                    acct_name: req.body.localAccount_name,
                    acct_number: req.body.localAccount_number,
                    amount: amt_send,
                    bank_name: req.body.localBank_name,
                    bank_address: req.body.localBank_address,
                    sender_name: userDetails.surname+' '+userDetails.first_name,
                    tran_type: 'Transfer',
                    transac_nature: 'Debit',
                    tran_desc: req.body.localBank_address ? req.body.localBank_address : 'Local bank transfer',
                    trans_balance: curBalance,
                    createdBy: userId,
                    tid: req.body.tid_record,
                    tr_year: req.body.year,
                    tr_month: req.body.month,
                    transaction_status: 'Successful',
                    colorcode:'red',
                    sender_currency_type: userDetails.currency_type,
                    sender_acct_number: userDetails.acct_number,
                });   
                sendFund = await fundsend.save();
               
                     // create log here
                     const addLogs = await SystemActivity.create({
                      log_username: userDetails.username,
                      log_name: userDetails.username+' '+ userDetails.first_name,
                      log_acct_number: userDetails.acct_number,
                      log_receiver_name: req.body.localAccount_name,
                      log_receiver_number: req.body.localAccount_number,
                      log_receiver_bank: req.body.localBank_name,
                      log_country: '',
                      log_swift_code: '',
                      log_desc:'Initiated local fund transfer details',
                      log_amt: amt_send,
                      log_status: 'Successful',
                      log_nature:'Local transfer details',
                     });
                  // create notification for user 
                   const senderUserLogs = Notification.create({
                    alert_username: userDetails.username,
                    alert_name: 'Debit Alert',
                    alert_user_ip: '',
                    alert_country: '',
                    alert_browser: '',
                    alert_date:  req.body.todayDate,
                    alert_user_id: userDetails._id,
                    alert_nature: 'Your local fund transfer was successful',
                    alert_status: 1,
                    alert_read_date: ''
                });

                const receiverUserLogs = Notification.create({
                    alert_username: userDetails.username,
                    alert_name: userDetails.surname+' '+userDetails.first_name,
                    alert_user_ip: '',
                    alert_country: '',
                    alert_browser: '',
                    alert_date:  req.body.todayDate,
                    alert_user_id: receiverUserDetails._id,
                    alert_nature: 'Your account has been credited with '+receiverUserDetails.currency_type +sendAmount ,
                    alert_status: 1,
                    alert_read_date: ''
                });
                // email notification sending
                
                async function main() {
                    // send mail with defined transport object
                    const info = await transporter .sendMail({
                        from: '"Rugipo Alumni" <noreply@rugipoalumni.zictech-ng.com>', // sender address
                      to: userDetails.email, // list of receivers
                      subject: 'Funds Transfer',
                      text: `Hello ${userDetails.surname+' '+userDetails.first_name}, this is to notify you that a transaction of ${userDetails.currency_type+sendAmount} occurred in your account, Please contact your account officer if this is not you for immediate intervention.`,
                      html: `
                    <!DOCTYPE html>
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
                                            <img src="https://img.icons8.com/ios/50/null/money-bag.png" style="display: block; border: 0px;" /><br>
                                                <h2 style="font-size: 25px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                                    Fund Transfer Successful
                                                </h2>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                                Hello ${userDetails.surname+' '+userDetails.first_name}, this is to notify you that a transaction of ${userDetails.currency_type+sendAmount} occurred in your account, Please contact your account officer if this is not you for immediate support.
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="left" style="padding-top: 20px;">
                                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td colspan="2" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                                        Transaction Details
                                                    </td>
                                                </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                                            Sender Acc/Number
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                                            ${userDetails.acct_number}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Sender Account Name
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            ${userDetails.first_name +' ' + userDetails.last_name}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Receiver Name
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            ${req.body.localAccount_name}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Receiver Acct/Number
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            ${req.body.localAccount_name}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Receiver Bank Name
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            ${req.body.localBank_name}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Transaction Date
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            ${req.body.todayDate}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Status 
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                            Successful
                                                        </td>
                                            </tr>
                                            </table>
                                        </td>
                                        </tr>
                                        <tr>
                                            <td align="left" style="padding-top: 20px;">
                                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                    <tr>
                                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                                            Amount
                                                        </td>
                                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                                            ${userDetails.currency_type}${new Intl.NumberFormat().format(amt_send)}
                                                        </td>
                                                    </tr>
                                                </table>
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
                                                    Contact support for any irregularity.
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
                    main().catch('Message Error', console.error);
                   
                 res.send({ msg: '200'})
              }
        } catch (err) {
        res.status(500).send({ msg: "500", err });
        console.error(err);
      }
  
  });

  // confirm wire pin from mobile app here..
router.post("/confirm_pinWireMobile", async (req, res) => {
    console.log("Backend Data receive ", req.body)
    const numberWithoutCommas = req.body.localAmount.replace(/,/g, '');
    //console.log('Amount ', numberWithoutCommas)
    const sendAmount = req.body.localAmount
    const userId = req.body.createdBy;
    const amt_send = numberWithoutCommas;
    const filter = { _id: req.body.createdBy };

    try {
            let userDetails = await User.findOne({ _id: userId });
            if (!userDetails) {
                return res.json({status: 402, message: ' No user found'});
            } 
            if (userDetails.acct_pin == "" || userDetails.acct_pin == null) {
                return res.json({status: 403, message: ' No user account pin found'}); // user account pin not found
            }
            if (userDetails.acct_pin != req.body.pin_code) {
                return res.json({status: 406, message: ' Invalid pin'}); // invalid pin entered
              } 
            if (userDetails.amount == "" || userDetails.amount < amt_send) {
                return res.json({status: 400, message: ' Low balance'}); // user account balance is low
              }
            else{
                const curBalance = parseFloat(userDetails.amount) - parseFloat(amt_send);
                // update user current balance here
                const updateDocBalance = {
                $set: {
                amount: curBalance,
                last_transaction: amt_send,
                    },
                };

                //const result_bal = await User.updateOne(filter, updateDocBalance);
                let fundsend = new TransferFund({
                    acct_name: req.body.localAccount_name,
                    acct_number: req.body.localAccount_number,
                    amount: amt_send,
                    bank_name: req.body.localBank_name,
                    bank_address: req.body.localBank_address,
                    sender_name: userDetails.surname+' '+userDetails.first_name,
                    tran_type: 'Transfer',
                    transac_nature: 'Debit',
                    tran_desc: req.body.localBank_address ? req.body.localBank_address : 'Wire fund transfer',
                    trans_balance: curBalance,
                    createdBy: userId,
                    tid: req.body.tid_record,
                    tr_year: req.body.year,
                    tr_month: req.body.month,
                    transaction_status: 'Pin authenticated',
                    colorcode:'red',
                    sender_currency_type: userDetails.currency_type,
                    sender_acct_number: userDetails.acct_number,
                });
                   
                sendFund = await fundsend.save();
                     // create log here
                     const addLogs = await SystemActivity.create({
                      log_username: userDetails.username,
                      log_name: userDetails.username+' '+ userDetails.first_name,
                      log_acct_number: userDetails.acct_number,
                      log_receiver_name: req.body.localAccount_name,
                      log_receiver_number: req.body.localAccount_number,
                      log_receiver_bank: req.body.localBank_name,
                      log_country: '',
                      log_swift_code: '',
                      log_desc:'Initiated wire fund transfer',
                      log_amt: amt_send,
                      log_status: 'Initiated',
                      log_nature:'Wire transfer details',
                     });
              
                  // create notification for user 
                   const userLogs = Notification.create({
                    alert_username: userDetails.username,
                    alert_name: userDetails.surname+' '+userDetails.first_name,
                    alert_user_ip: '',
                    alert_country: '',
                    alert_browser: '',
                    alert_date:  req.body.todayDate,
                    alert_user_id: userDetails._id,
                    alert_nature: 'Your wire fund transfer initiated',
                    alert_status: 1,
                    alert_read_date: ''
                });
                res.send({ msg: '200'})
              }
        } catch (err) {
        res.status(500).send({ msg: "500", err });
        console.error(err);
      }
  
  });
  

    // wire transfer cot code confirm routes goes here...
router.post("/cot_confirmMobile", async (req, res) => {
    let fundData = req.body;
    const userId = req.body.createdBy;
    console.log("COT Details: ", req.body)
    const numberWithoutCommas = req.body.send_amt.replace(/,/g, '');
    const amt_send = numberWithoutCommas;
    // get the transfer record ID here
    const filter = { tid: req.body.tran_id };
    try {
      if (req.body.cot_code == "" || req.body.cot_code == null) {
        return res.json({status: 404, message: ' cot require'});
       }
      let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
       if (!userDetails) {
        return res.json({status: 402, message: ' No user found'});
      } 
      else if (userDetails){
        if (userDetails.acct_cot != req.body.cot_code) {
            return res.json({status: 403, message: 'Wrong COT'});; // invalid cot code entered
        } 
        else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
            return res.json({status: 401, message: ' Account not acctive'});; // account is blocked
        } 
        else if (userDetails.acct_cot == req.body.cot_code) {
            //update single record transfer status collection here
             const updateDoc = {
              $set: {
                transaction_status: "COT Code Validated",
              },
            }
            const result = await TransferFund.updateOne(filter, updateDoc);
            if(result){
                // create log here
                const addLogs = await SystemActivity.create({
                log_username: userDetails.username,
                log_name: userDetails.username+' '+ userDetails.first_name,
                log_acct_number: userDetails.acct_number,
                log_receiver_name: req.body.holder_name,
                log_receiver_number: req.body.acct_number,
                log_receiver_bank: req.body.bank_name,
                log_swift_code: req.body.swift_code,
                log_desc:'Wire fund transfer COT details',
                log_amt: amt_send,
                log_status: 'Successful',
                log_nature:'Wire transfer COT',
            });
            // create notification for user 
            const userLogs = Notification.create({
            alert_username: userDetails.username,
            alert_name: userDetails.username+' '+userDetails.first_name,
            alert_user_ip: '',
            alert_country: '',
            alert_browser: '',
            alert_date:  Date.now(),
            alert_user_id: userDetails._id,
            alert_nature: 'Your wire fund transfer COT code validated! Complete the process for a successful wire fund transfer',
            alert_status: 1,
            alert_read_date: ''
            });
            }
        res.send({ msg: '200'})
          }
       }
      } catch (err) {
      res.status(500).send({ msg: "500" });
    }
    
  });

  // wire transfer TAX code confirm Mobile routes goes here...
router.post("/taxCode_confirmMobile", async (req, res) => {
    let fundData = req.body;
    const userId = req.body.createdBy;
    //console.log("TAX Code Details: ", req.body)
    const numberWithoutCommas = req.body.send_amt.replace(/,/g, '');
    const amt_send = numberWithoutCommas;
    // get the transfer record ID here
    const filter = { tid: req.body.tran_id };
    try {
      if (req.body.cot_code == "" || req.body.cot_code == null) {
        return res.json({status: 404, message: ' tax require'});
       }
      let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
       if (!userDetails) {
        return res.json({status: 402, message: ' No user found'});
      } 
      else if (userDetails){
        if (userDetails.acct_tax_code != req.body.cot_code) {
            return res.json({status: 403, message: 'Wrong tax code'});; // invalid cot code entered
        } 
        else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
            return res.json({status: 401, message: ' Account not acctive'});; // account is blocked
        } 
        else if (userDetails.acct_tax_code == req.body.cot_code) {
            //update single record transfer status collection here
             const updateDoc = {
              $set: {
                transaction_status: "Tax Code Validated",
              },
            }
            const result = await TransferFund.updateOne(filter, updateDoc);
             // create log here
            const addLogs = await SystemActivity.create({
            log_username: userDetails.username,
            log_name: userDetails.username+' '+ userDetails.first_name,
            log_acct_number: userDetails.acct_number,
            log_receiver_name: req.body.holder_name,
            log_receiver_number: req.body.acct_number,
            log_receiver_bank: req.body.bank_name,
            log_country: '',
            log_swift_code: req.body.swift_code,
            log_desc:'Wire fund transfer Tax Code details',
            log_amt: amt_send,
            log_status: 'Successful',
            log_nature:'Wire transfer Tax Code',
        });

        // create notification for user 
        const userLogs = Notification.create({
          alert_username: userDetails.username,
          alert_name: userDetails.username+' '+userDetails.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: userDetails._id,
          alert_nature: 'Your wire fund transfer Tax code validated! Complete the process for a successful wire fund transfer',
          alert_status: 1,
          alert_read_date: ''
      });
            res.send({ msg: '200'})
          }
       }
      } catch (err) {
      res.status(500).send({ msg: "500" });
    }
    
  });

   // wire transfer IFM code confirm Mobile routes goes here...
router.post("/imfCode_confirmMobile", async (req, res) => {
    let fundData = req.body;
    const userId = req.body.createdBy;
    //console.log("IMF Code Details: ", req.body)
    const numberWithoutCommas = req.body.send_amt.replace(/,/g, '');
    const amt_send = numberWithoutCommas;
    // get the transfer record ID here
    const filter = { tid: req.body.tran_id };
    const filterUser = { _id: req.body.createdBy };

    try {
      if (req.body.imf_code == "" || req.body.imf_code == null) {
        return res.json({status: 404, message: ' tax require'});
       }
      let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
       if (!userDetails) {
        return res.json({status: 402, message: ' No user found'});
      } 
      else if (userDetails){
        if (userDetails.acct_imf_code != req.body.imf_code) {
            return res.json({status: 403, message: 'Wrong tax code'}); // invalid cot code entered
        } 
        else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
            return res.json({status: 401, message: ' Account not acctive'}); // account is blocked
        } 
        else if (userDetails.amount == "" || userDetails.amount < amt_send){
            return res.json({status: 501, message: ' Low balance'})
        }
        else if (userDetails.acct_imf_code == req.body.imf_code) {
            // get receiver details details here
            let receiverUserDetails = await User.findOne({ acct_number: req.body.localAccount_number });

            if(receiverUserDetails){
                let rb = parseFloat(receiverUserDetails.amount);
                let rc = parseFloat(amt_send);
                var receiverCurBalance = parseFloat(rb + rc);
                //const totalAmount = receiverCurBalance += amt_send;
                const filterReceiver = {_id: receiverUserDetails._id}
                const updateReceiverDocBalance = {
                $set: {
                amount: receiverCurBalance,
                last_transaction: amt_send,
                    },
                };
            const result_bal = await User.updateOne(filterReceiver, updateReceiverDocBalance);
            //receiver statement here
            const receiverStatement = TransferFund.create({
                acct_name: req.body.localAccount_name,
                acct_number: req.body.localAccount_number,
                amount: amt_send,
                bank_name: req.body.localBank_name,
                bank_address: req.body.localBank_address,
                sender_name: userDetails.surname+' '+userDetails.first_name,
                tran_type: 'Transfer',
                transac_nature: 'Credit',
                tran_desc: req.body.localBank_address ? req.body.localBank_address : 'Wire bank transfer',
                trans_balance: receiverCurBalance,
                createdBy: receiverUserDetails._id,
                tid: req.body.tid_record,
                tr_year: req.body.year,
                tr_month: req.body.month,
                transaction_status: 'Successful',
                colorcode:'green',
                sender_currency_type: receiverUserDetails.currency_type,
                sender_acct_number: userDetails.acct_number,
             });
            }

            // sender details update 
            let oldAmt = parseFloat(userDetails.amount)
            let newAmt = parseFloat(amt_send)
            const curBalance = (oldAmt - newAmt);// remove amount send from user current balance
             // update transfer status table to be successful
          const updateDoc = {
            $set: {
              transaction_status: "Successful",
              tran_type: "Transfer",
              transac_nature: "Debit",
              tran_desc: "Wire Fund transfer",
              trans_balance: curBalance,
            },
          };
        
          const resultUpdate = await TransferFund.updateOne(filter, updateDoc);
          // update user current balance here
            const updateDocBalance = {
              $set: {
                amount: curBalance,
                last_transaction: amt_send,
              },
            };

          const result_bal = await User.updateOne(filterUser, updateDocBalance);
          
             // create log here
            const addLogs = await SystemActivity.create({
            log_username: userDetails.username,
            log_name: userDetails.username+' '+ userDetails.first_name,
            log_acct_number: userDetails.acct_number,
            log_receiver_name: req.body.holder_name,
            log_receiver_number: req.body.acct_number,
            log_receiver_bank: req.body.bank_name,
            log_country: '',
            log_swift_code: req.body.swift_code,
            log_desc:'Wire fund transfer IMF Entered',
            log_amt: amt_send,
            log_status: 'Successful',
            log_nature:'Wire transfer IMF Code',
        });

        // create notification for user 
        const userLogs = Notification.create({
          alert_username: userDetails.username,
          alert_name: 'Debit alert',
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: userDetails._id,
          alert_nature: 'Your wire fund transfer IMF code validated! Complete the process for a successful wire fund transfer',
          alert_status: 1,
          alert_read_date: ''
      });

      const receiverUserLogs = Notification.create({
        alert_username: userDetails.username,
        alert_name: userDetails.surname+' '+userDetails.first_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date:  Date.now(),
        alert_user_id: receiverUserDetails._id,
        alert_nature: 'Your account has been credited with '+receiverUserDetails.currency_type + req.body.send_amt,
        alert_status: 1,
        alert_read_date: ''
    });

     // email notification sending
    async function main() {
        // send mail with defined transport object
        const info = await transporter .sendMail({
          from: '"Rugipo Alumni" <noreply@rugipoalumni.zictech-ng.com>', // sender address
          to: userDetails.email, // list of receivers
          subject: 'Funds Transfer',
          text: `Hello ${userDetails.surname+' '+userDetails.first_name}, this is to notify you that a transaction of ${userDetails.currency_type+sendAmount} occurred in your account, Please contact your account officer if this is not you for immediate intervention.`,
          html: `
          <!DOCTYPE html>
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
                                <img src="https://img.icons8.com/ios/50/null/money-bag.png" style="display: block; border: 0px;" /><br>
                                    <h2 style="font-size: 25px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                        Fund Transfer Successful
                                    </h2>
                                </td>
                            </tr>
                            <tr>
                                <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                    <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                    Hello ${userDetails.surname+' '+userDetails.first_name}, this is to notify you that a transaction of ${userDetails.currency_type+req.body.send_amt} occurred in your account, Please contact your account officer if this is not you for immediate support.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td align="left" style="padding-top: 20px;">
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td colspan="2" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                            Transaction Details
                                        </td>
                                    </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                                Sender Acc/Number
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                                ${userDetails.acct_number}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                               Sender Account Name
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                ${userDetails.first_name +' ' + userDetails.last_name}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                Receiver Name
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                ${req.body.localAccount_name}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                Receiver Acct/Number
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                ${req.body.localAccount_name}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                Receiver Bank Name
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                ${req.body.localBank_name}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                Transaction Date
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                ${req.body.todayDate}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                Status 
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                                Successful
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td align="left" style="padding-top: 20px;">
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                                Amount
                                            </td>
                                            <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                               ${userDetails.currency_type}${new Intl.NumberFormat().format(amt_send)}
                                            </td>
                                        </tr>
                                    </table>
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
                                        Contact support for any irregularity.
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
        main().catch('Message Error', console.error);
       
        res.send({ msg: '200'})
          }
       }
      } catch (err) {
      res.status(500).send({ msg: "500" });
    }
    //res.send({ msg: '200'})
  });

  // wire transfer cot code confirm routes goes here...
router.post("/cot_confirm", verifyToken, async (req, res) => {
    let fundData = req.body;
    const userId = req.body.createdBy;
    //console.log("PIN: ", req.body.createdBy)
    // get the transfer record ID here
    const filter = { tid: req.body.tran_id };
    try {
      if (req.body.cot_code == "" || req.body.cot_code == null) {
       return res.status(404).send({ msg: "404" }); // cot code required
       }
      let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
       if (!userDetails) {
        res.status(402).send({ msg: '402' });
      } 
      else if (userDetails){
       if (userDetails.acct_cot == "" || userDetails.acct_cot == null) {
          res.status(403).json({ msg: "403" }); // cot code required
          //console.log("Pin empty: ", res.status)
        }
        else if (userDetails.acct_cot != req.body.cot_code) {
          res.status(406).send({ msg: "406" }); // invalid cot code entered
        } 
        else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
          res.status(401).send({ msg: "401" }); // account is blocked
        } 
        else if (userDetails.acct_cot == req.body.cot_code) {
            //update single record transfer status collection here
             const updateDoc = {
              $set: {
                transaction_status: "COT Code Validated",
              },
            }
            const result = await TransferFund.updateOne(filter, updateDoc);
             // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: req.body.holder_name,
        log_receiver_number: req.body.acct_number,
        log_receiver_bank: req.body.bank_name,
        log_country: '',
        log_swift_code: req.body.swift_code,
        log_desc:'Wire fund transfer COT details',
        log_amt: req.body.send_amt,
        log_status: 'Successful',
        log_nature:'Wire transfer COT',
       });

        // create notification for user 
        const userLogs = Notification.create({
          alert_username: userDetails.username,
          alert_name: userDetails.username+' '+userDetails.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: userDetails._id,
          alert_nature: 'Your wire fund transfer COT code validated! Complete the process for a successful wire fund transfer',
          alert_status: 1,
          alert_read_date: ''
      });
            res.status(201).send({ msg: "201" });
          }
       }
      } catch (err) {
      res.status(500).send({ msg: "500" });
    }
  });

  // wire transfer IMF code confirm routes goes here...
router.post("/imf_confirm", verifyToken, async (req, res) => {
  const userId = req.body.createdBy;
  //console.log("PIN: ", req.body.createdBy)
  // get the transfer record ID here
  const filter = { tid: req.body.tran_id };
  try {
    const filterUser = { _id: req.body.createdBy }; // get current user ID here from request send

    if (req.body.imf_code == "" || req.body.imf_code == null) {
     return res.status(404).send({ msg: "404" }); // imf code required
     }
     let tranAmount = await TransferFund.findOne({ tid: req.body.tran_id }); // get the amount transfer from transfer table
     let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
     
    const curBalance = userDetails.amount - tranAmount.amount; // remove amount send from user current balance
    
    if (!userDetails) {
      res.status(402).send({ msg: '402' });
    } 
    else if (userDetails){
     if (userDetails.acct_imf_code == "" || userDetails.acct_imf_code == null) {
        res.status(403).json({ msg: "403" }); // imf code not active
        //console.log("Pin empty: ", res.status)
      }
      else if (userDetails.acct_imf_code != req.body.imf_code) {
        res.status(406).send({ msg: "406" }); // invalid cot code entered
      } 
      else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
        res.status(401).send({ msg: "401" }); // account is blocked
      } 
      else if (userDetails.acct_imf_code == req.body.imf_code) {
          
         // update transfer status table to be successful
          const updateDoc = {
            $set: {
              transaction_status: "Successful",
              tran_type: "Transfer",
              transac_nature: "Debit",
              tran_desc: "Wire Fund transfer",
              trans_balance: curBalance,
            },
          };
        
          const result = await TransferFund.updateOne(filter, updateDoc);
          // update user current balance here
            const updateDocBalance = {
              $set: {
                amount: curBalance,
                last_transaction: tranAmount.amount,
              },
            };

          const result_bal = await User.updateOne(filterUser, updateDocBalance);
           // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: req.body.holder_name,
        log_receiver_number: req.body.acct_number,
        log_receiver_bank: req.body.bank_name,
        log_country: '',
        log_swift_code: req.body.swift_code,
        log_desc:'Wire fund transfer IMF Entered',
        log_amt: req.body.send_amt,
        log_status: 'Successful',
        log_nature:'Wire transfer IMF detail',
       });

        // create notification for user 
        const userLogs = Notification.create({
          alert_username: userDetails.username,
          alert_name: userDetails.username+' '+userDetails.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: userDetails._id,
          alert_nature: 'Your wire fund transfer IMF code validated! Complete the process for a successful wire fund transfer',
          alert_status: 1,
          alert_read_date: ''
      })
          res.status(201).send({ msg: "201" });
        }
     }
    } catch (err) {
    res.status(500).send({ msg: "500" });
  }
});


router.get("/wire_fund_send/:id", async (req, res) =>{
  let recId = req.params.id;
  //console.log("Record", recId);
  try {
    const transferDetails = await TransferFund.find({tid: recId});
    //console.log(transferDetails);
    // get user details
     const userDetails = await User.findOne({_id: transferDetails.createdBy})
       // create notification for user 
     const userLogs = Notification.create({
      alert_username: transferDetails.sender_name,
      alert_name: transferDetails.sender_name,
      alert_user_ip: '',
      alert_country: '',
      alert_browser: '',
      alert_date:  Date.now(),
      alert_user_id: transferDetails.createdBy,
      alert_nature: 'Your fund transfer successful! If you have any questions please contact support',
      alert_status: 1,
      alert_read_date: ''
  });

    res.status(200).send(transferDetails);

    // email notification sending
    const messageBody ={
      // to: checkUser.email,
      to: [userDetails.email], // this will allowed you to add more email to receive notification
      // from: 'perrysmith562@gmail.com ',
      from:{
        name: 'Rugipo Alumni Finance',
        email: 'perrysmith562@gmail.com'
      },
      subject: 'Funds Transfer',
      text: `Hello ${transferDetails.sender_name}, this is to notify you that a transaction of ${transferDetails.sender_currency_type+transferDetails.amount} occurred in your account, Please contact your account officer if this is not you for immediate intervention.`,
      html: `
      <!DOCTYPE html>
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
                            <img src="https://img.icons8.com/ios/50/null/money-bag.png" style="display: block; border: 0px;" /><br>
                                <h2 style="font-size: 25px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                    Fund Transfer Successful
                                </h2>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                Hello ${transferDetails.sender_name}, this is to notify you that a transaction of ${transferDetails.sender_currency_type+transferDetails.amount} occurred in your account, Please contact your account officer if this is not you for immediate support.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td colspan="2" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                        Transaction Details
                                    </td>
                                </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            Sender Acc/Number
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            ${userDetails.acct_number}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                           Sender Account Name
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${userDetails.first_name +' ' + userDetails.last_name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Receiver Name
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${transferDetails.acct_name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Receiver Acct/Number
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${transferDetails.acct_number}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Receiver Bank Name
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${transferDetails.bank_name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Transaction Date
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${Date.Now()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Status 
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Successful
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                            Amount
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                           ${userDetails.currency_type}${new Intl.NumberFormat().format(transferDetails.amount)}
                                        </td>
                                    </tr>
                                </table>
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
                                    Contact support for any irregularity.
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
    };
      sgMail.send(messageBody).then((response) => console.log('Message Response: ', response.message))
      .catch((err) => console.log(err.message));

  } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
})


 // domestic fund transfer routes goes here...
 router.post("/domestic_fund_send", verifyToken, async (req, res) => {
  let fundData = req.body;
  //console.log("User details",  req.body);
  
  const userId = req.body.createdBy;
  const amt_send = req.body.send_amt;
  
  try {
    // let sendFund;
    let userDetails = await User.findOne({ _id: userId }); // where I am checking if user exist the I will get user details
    //  console.log(`${userDetails.name}`); // is showing undefine.
    let fundsend = new TransferFund({
      acct_name: req.body.holder_name,
      acct_number: req.body.acct_number,
      swift_code: req.body.swift_code,
      amount: req.body.send_amt,
      bank_name: req.body.bank_name,
      bank_address: req.body.address,
      sender_name: userDetails.surname+' '+userDetails.first_name,
      tran_type: 'Transfer',
      transac_nature: 'Debit',
      tran_desc: 'Domestic bank transfer',
      createdBy: userId,
      tid: req.body.tid,
      tr_year: req.body.tr_year,
      tr_month: req.body.tr_month,
      colorcode:'red',
      sender_currency_type: userDetails.currency_type,
      sender_acct_number: userDetails.acct_number,
  });
    if (!userDetails) {
      res.status(402).send({ msg: "402" });
      //console.log("User not fund!"); // user account not found then show error
    } else if (
      userDetails.acct_status == "Pending" ||
      userDetails.acct_status == null
    ) {
      res.status(403).send({ msg: "403" });
      // user account status is not active
    } else if (userDetails.amount == "" || userDetails.amount < amt_send) {
      res.status(405).send({ msg: "405" }); // user account balance is low
    } else if (userDetails) {
      sendFund = await fundsend.save();
       // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: req.body.holder_name,
        log_receiver_number: req.body.acct_number,
        log_receiver_bank: req.body.bank_name,
        log_country: '',
        log_swift_code: req.body.swift_code,
        log_desc:'Initiated domestic fund transfer details',
        log_amt: req.body.send_amt,
        log_status: 'Successful',
        log_nature:'Domestic transfer details',
       });

    // create notification for user 
     const userLogs = Notification.create({
      alert_username: userDetails.username,
      alert_name: userDetails.surname+' '+userDetails.first_name,
      alert_user_ip: '',
      alert_country: '',
      alert_browser: '',
      alert_date:  Date.now(),
      alert_user_id: userDetails._id,
      alert_nature: 'Your domestic fund transfer initiated! Please complete the process for a successful transfer',
      alert_status: 1,
      alert_read_date: ''
  });
      res.status(200).send({ msg: "200", sendFund });
    }

    //fundsend.createdBy = (User._id); // get current user ID
  } catch (err) {
    res.status(500).send({ msg: "500" });
  }
});

// domestic transfer pin confirm routes goes here...
router.post("/domestic_pin", verifyToken, async (req, res, next) => {
  const userId = req.body.createdBy;
  console.log("PIN: ", req.body.createdBy)
  // get the transfer record ID here
  const filter = { tid: req.body.tran_id };
  try {
    if (req.body.pin_code == "" || req.body.pin_code == null) {
     return res.status(404).send({ msg: "404" }); // cot code required
     }
   
     let tranAmount = await TransferFund.findOne({ tid: req.body.tran_id }); // get the amount transfer from transfer table
     let userDetails = await User.findOne({ _id: userId }); // here I am checking if user exist then I will get user details
     
     const curBalance = userDetails.amount - tranAmount.amount; // remove amount send from user current balance

     if (!userDetails) {
      res.status(402).send({ msg: '402' });
    } 
    else if (userDetails){

     if (userDetails.acct_pin == "" || userDetails.acct_pin == null) {
        res.status(403).json({ msg: "403" }); // user account pin not found
        //console.log("Pin empty: ", res.status)
      }
      else if (userDetails.acct_pin != req.body.pin_code) {
        res.status(406).send({ msg: "406" }); // invalid pin entered
      } 
      else if (userDetails.acct_status !== 'Active' || userDetails.acct_status == null) {
        res.status(401).send({ msg: "401" }); // account is blocked
      } 
      else if (userDetails.acct_pin == req.body.pin_code) {
          //update single record transfer status collection here
          //console.log("Pin was found: ", res)
         
          // update transfer status table to be successful
          const updateDoc = {
            $set: {
              transaction_status: "Successful",
              tran_type: "Transfer",
              transac_nature: "Debit",
              tran_desc: "Domestic Fund transfer",
              trans_balance: curBalance,
            },
          };
        
          const result = await TransferFund.updateOne(filter, updateDoc);
          // update user current balance here
            const updateDocBalance = {
              $set: {
                amount: curBalance,
                last_transaction: tranAmount.amount,
              },
            };
             // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: req.body.holder_name,
        log_receiver_number: req.body.acct_number,
        log_receiver_bank: req.body.bank_name,
        log_country: '',
        log_swift_code: req.body.swift_code,
        log_desc:'Domestic fund transfer PIN entered',
        log_amt: req.body.send_amt,
        log_status: 'Successful',
        log_nature:'Domestic transfer PIN detail',
       });

       // create notification for user 
     const userLogs = Notification.create({
      alert_username: userDetails.username,
      alert_name: userDetails.surname+' '+userDetails.first_name,
      alert_user_ip: '',
      alert_country: '',
      alert_browser: '',
      alert_date:  Date.now(),
      alert_user_id: userDetails._id,
      alert_nature: 'Your domestic fund transfer PIN validated! Please complete the process for a successful transfer',
      alert_status: 1,
      alert_read_date: ''
  })
          res.status(201).send({ msg: "201" });
        }
     }
    
    } catch (err) {
    res.status(500).send({ msg: "500" });
  }
});


// Admin crediting user account routes goes here...
router.post("/credit_user", verifyToken, async (req, res) => {
  let fundData = req.body;
  //console.log("User details",  req.body);
  
  const userId = req.body.credit_sender_id;
  const amt_send = req.body.sending_amt;
  const filter = { _id: req.body.credit_sender_id };
  
  try {
    // let sendFund;
    let userDetails = await User.findOne({ _id: userId }); // where I am checking if user exist the I will get user details
    const userBalance = userDetails.amount+ +amt_send
    //  console.log(`${userDetails.name}`); // is showing undefine.
    let creditUserAccount = new TransferFund({
      acct_name: userDetails.surname+' ' +userDetails.first_name,
      acct_number: userDetails.acct_number,
      amount: req.body.sending_amt,
      bank_name: userDetails.user_bank_name,
      sender_name: 'Bank Credit',
      tran_type: 'Credit',
      transac_nature: 'Credit',
      tran_desc: req.body.credit_note,
      trans_balance: userBalance,
      createdBy: userId,
      tid: req.body.tid,
      tr_year: req.body.tr_year,
      tr_month: req.body.tr_month,
      colorcode:'green',
      sender_currency_type: userDetails.currency_type,
      sender_acct_number: userDetails.acct_number,
      transaction_status: req.body.credit_status,
      createdOn: req.body.credit_date,
  });
    if (!userDetails) {
      res.status(402).send({ msg: "402" });
      //console.log("User not fund!"); // user account not found then show error
    } else if (
      userDetails.acct_status == "Pending" ||
      userDetails.acct_status == null
    ) {
      res.status(403).send({ msg: "403" });
      // user account status is not active
    } else if (userDetails) {
       // add up amount to user current balance
       const curBalance = userDetails.amount+ +amt_send
       const updateDocBalance = {
        $set: {
          amount: curBalance,
          last_transaction: req.body.sending_amt,
          acct_balance: curBalance,
        },
      };

      const result = await User.updateOne(filter, updateDocBalance);
     
      sendFund = await creditUserAccount.save();
       // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: userDetails.username+' '+ userDetails.first_name,
        log_receiver_number:userDetails.acct_number,
        log_receiver_bank: userDetails.bank_name,
        log_country: '',
        log_swift_code: '',
        log_desc:'Crediting user account details',
        log_amt: req.body.sending_amt,
        log_status: 'Successful',
        log_nature:'Admin post credit details',
       });
       // create notification for user 
     const userLogs = Notification.create({
      alert_username: userDetails.username,
      alert_name: userDetails.surname+' '+userDetails.first_name,
      alert_user_ip: '',
      alert_country: '',
      alert_browser: '',
      alert_date:  Date.now(),
      alert_user_id: userDetails._id,
      alert_nature: 'Your account has been credited! Please if you have any questions contact support',
      alert_status: 1,
      alert_read_date: ''
  })

  // email notification sending
  const messageBody ={
    // to: checkUser.email,
    to: userDetails.email, // this will allowed you to add more email to receive notification
    // from: 'perrysmith562@gmail.com ',
    from:{
      name: 'Rugipo Alumni Finance',
      email: 'perrysmith562@gmail.com'
    },
    subject: 'Credit Notification',
    text: `Hello ${userDetails.first_name}, this is to notify you that a credit transaction of ${userDetails.currency_type+amt_send} occurred in your account, Please contact your account officer if there is any irregularity for immediate intervention.`,
    html: `
    <!DOCTYPE html>
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
                                                <img src="https://rugipofinance.onrender.com/images/RAF_LOGO.png" width="100" height="100"/>&nbsp;</a></p>
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
                            <img src="https://img.icons8.com/ios/50/null/money-bag.png" style="display: block; border: 0px;" /><br>
                                <h2 style="font-size: 25px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                    Account Credit Notification
                                </h2>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                Hello ${userDetails.first_name}, this is to notify you that a credit transaction of ${userDetails.currency_type+amt_send} occurred in your account, Please contact your account officer if there is any irregularity for immediate intervention
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td colspan="2" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                        Transaction Details
                                    </td>
                                </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            Acc/Number
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            ${userDetails.acct_number}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                           Account Name
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${userDetails.first_name +' ' + userDetails.surname}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Transaction Date
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${req.body.credit_date}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Status 
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Successful
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                            Amount
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                         ${userDetails.currency_type}${new Intl.NumberFormat().format(req.body.sending_amt)}
                                        </td>
                                    </tr>
                                </table>
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
                                    Contact support for any irregularity.
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
  };
    sgMail.send(messageBody).then((response) => console.log('Message Response: ', response.message))
    .catch((err) => console.log(err.message));

      res.status(201).send({ msg: "201" });
    }

    //fundsend.createdBy = (User._id); // get current user ID
  } catch (err) {
    res.status(500).send({ msg: "500" });
  }
});

// Admin debitting user account routes goes here...
router.post("/debit_user", verifyToken, async (req, res) => {
  let fundData = req.body;
  //console.log("User details",  req.body);
  
  const userId = req.body.debit_sender_id;
  const amt_send = req.body.debit_sending_amt;
  const filter = { _id: req.body.debit_sender_id };
  
  try {
    // let sendFund;
    let userDetails = await User.findOne({ _id: userId }); // where I am checking if user exist the I will get user details
    const userBalance = userDetails.amount - amt_send
    //  console.log(`${userDetails.name}`); // is showing undefine.
    let debitUserAccount = new TransferFund({
      acct_name: userDetails.surname+' ' +userDetails.first_name,
      acct_number: userDetails.acct_number,
      amount: req.body.debit_sending_amt,
      bank_name: userDetails.user_bank_name,
      sender_name: 'Bank Debit',
      tran_type: 'Debit',
      transac_nature: 'Debit',
      tran_desc: req.body.debit_note,
      trans_balance: userBalance,
      createdBy: userId,
      tid: req.body.tid,
      tr_year: req.body.tr_year,
      tr_month: req.body.tr_month,
      colorcode:'red',
      sender_currency_type: userDetails.currency_type,
      sender_acct_number: userDetails.acct_number,
      transaction_status: req.body.debit_status,
      createdOn: req.body.debit_date,
  });
    if (!userDetails) {
      res.status(402).send({ msg: "402" });
      //console.log("User not fund!"); // user account not found then show error
    } else if (
      userDetails.acct_status == "Pending" ||
      userDetails.acct_status == null
    ) {
      res.status(403).send({ msg: "403" });
      // user account status is not active
    } 
    else if (userDetails.amount == null || userDetails.amount < amt_send ) 
    {
      res.status(401).send({ msg: "401" }); // Insufficient funds in account
    } else if (userDetails) {
       // add up amount to user current balance
       const curBalance = userDetails.amount - amt_send
       const updateDocBalance = {
        $set: {
          amount: curBalance,
          last_transaction: req.body.debit_sending_amt,
          acct_balance: curBalance,
        },
      };

      const result = await User.updateOne(filter, updateDocBalance);
     // create log here
     const addLogs = await SystemActivity.create({
      log_username: userDetails.username,
      log_name: userDetails.username+' '+ userDetails.first_name,
      log_acct_number: userDetails.acct_number,
      log_receiver_name: userDetails.username+' '+ userDetails.first_name,
      log_receiver_number:userDetails.acct_number,
      log_receiver_bank: userDetails.bank_name,
      log_country: '',
      log_swift_code: '',
      log_desc:'Debiting user account details',
      log_amt: req.body.debit_sending_amt,
      log_status: 'Successful',
      log_nature:'Admin post debit details',
     })
      sendFund = await debitUserAccount.save();
        // create notification for user 
        const userLogs = Notification.create({
          alert_username: userDetails.username,
          alert_name: userDetails.surname+' '+userDetails.first_name,
          alert_user_ip: '',
          alert_country: '',
          alert_browser: '',
          alert_date:  Date.now(),
          alert_user_id: userDetails._id,
          alert_nature: 'Your account has been debited! Please if you have any questions contact support',
          alert_status: 1,
          alert_read_date: ''
      });

      // email notification sending
  const messageBody ={
    // to: checkUser.email,
    to: userDetails.email, // this will allowed you to add more email to receive notification
    // from: 'perrysmith562@gmail.com ',
    from:{
      name: 'Rugipo Alumni Finance',
      email: 'perrysmith562@gmail.com'
    },
    subject: 'Debit Notification',
    text: `Hello ${userDetails.first_name}, this is to notify you that a debit transaction occurred in your account, Please contact your account officer if there is any irregularity for immediate intervention.`,
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
                                                <img src="https://rugipofinance.onrender.com/images/RAF_LOGO.png" width="100" height="100"/>&nbsp;</a></p>
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
                            <img src="https://img.icons8.com/ios/50/null/money-bag.png" style="display: block; border: 0px;" /><br>
                                <h2 style="font-size: 25px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                    Account Debit Notification
                                </h2>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                Hello ${userDetails.first_name}, this is to notify you that a debit transaction of ${userDetails.currency_type+amt_send} occurred in your account, Please contact your account officer if there is any irregularity for immediate support.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td colspan="2" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                        Transaction Details
                                    </td>
                                </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            Acc/Number
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            ${userDetails.acct_number}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                           Account Name
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${userDetails.first_name +' ' + userDetails.surname}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Transaction Date
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${req.body.debit_date}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Status 
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Successful
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                            Amount
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                            ${userDetails.currency_type}${new Intl.NumberFormat().format(req.body.debit_sending_amt)}
                                        </td>
                                    </tr>
                                </table>
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
                                    Contact support for any irregularity.
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
    </html>
    
    
    
    
    
    `,
  };
    sgMail.send(messageBody).then((response) => console.log('Message Response: ', response.message))
    .catch((err) => console.log(err.message));

      res.status(201).send({ msg: "201" });
    }

    //fundsend.createdBy = (User._id); // get current user ID
  } catch (err) {
    res.status(500).send({ msg: "500" });
  }
});


// Admin crediting investors account routes goes here...
router.post("/credit_investors", verifyToken, async (req, res) => {
  let fundData = req.body;
  //console.log("User details",  req.body);
  
  const userId = req.body.credit_receiver_id;
  const amt_send = req.body.sending_amt;
  const filter = { _id: req.body.credit_receiver_id };
  
  try {
    // let sendFund;
    let userDetails = await User.findOne({ _id: req.body.credit_receiver_id }); // where I am checking if user exist the I will get user details
    let investDetails = await Investment.findOne({ _id: req.body.credit_record_id})
    //console.log(`${userDetails.surname}`); // is showing undefine.
    if (!userDetails) {
      res.status(402).send({ msg: "402" });
      //console.log("User not fund!"); // user account not found then show error
    } else if (
      userDetails.acct_status == "Pending" ||
      userDetails.acct_status == null
    ) {
      res.status(403).send({ msg: "403" });
      // user account status is not active
    } 
    else if (investDetails.invest_status !="Approved") {
      return res.status(401).send({ msg: "401" });
    }
    else if (userDetails) {
      let creditUserAccount = new InvestorsCreditAccount({
        receiver_name: userDetails.surname+' ' +userDetails.first_name,
        receiver_email: userDetails.email,
        plan_type: req.body.invest_type,
        investment_name: req.body.invest_plan,
        investment_duration: '',
        investment_notes: req.body.credit_note,
        transaction_type: 'Credit',
        roi_amt: req.body.sending_amt,
        credit_status: 'Successful',
        receiver_id: req.body.credit_receiver_id,
        investment_id: req.body.credit_record_id,
        addedBy:req.body.sender_id,
        tid: req.body.tid,
        post_date: req.body.credit_date
        });
       // add up amount to user current balance
      //  const curBalance = userDetails.amount+ +amt_send
      //  const updateDocBalance = {
      //   $set: {
      //     amount: curBalance,
      //     last_transaction: req.body.sending_amt,
      //     acct_balance: curBalance,
      //   },
      // };

      // const result = await User.updateOne(filter, updateDocBalance);
     
      sendFund = await creditUserAccount.save();
        // create log here
       const addLogs = await SystemActivity.create({
        log_username: userDetails.username,
        log_name: userDetails.username+' '+ userDetails.first_name,
        log_acct_number: userDetails.acct_number,
        log_receiver_name: userDetails.username+' '+ userDetails.first_name,
        log_receiver_number:userDetails.acct_number,
        log_receiver_bank: userDetails.bank_name,
        log_country: '',
        log_swift_code: '',
        log_desc:'Crediting user investment account details',
        log_amt: req.body.sending_amt,
        log_status: 'Successful',
        log_nature:'Admin post credit details',
       });
          // create notification for user 
     const userLogs = Notification.create({
      alert_username: userDetails.username,
      alert_name: userDetails.surname+' '+userDetails.first_name,
      alert_user_ip: '',
      alert_country: '',
      alert_browser: '',
      alert_date:  Date.now(),
      alert_user_id: userDetails._id,
      alert_nature: 'Your have receive ROI of your investment been credited! Please if you have any questions contact support',
      alert_status: 1,
      alert_read_date: ''
  });

    // email notification sending
  const messageBody ={
    // to: checkUser.email,
    to: [userDetails.email], // this will allowed you to add more email to receive notification
    // from: 'perrysmith562@gmail.com ',
    from:{
      name: 'Rugipo Alumni Finance',
      email: 'perrysmith562@gmail.com'
    },
    subject: 'ROI Credit Notification',
    text: `Hello ${userDetails.first_name}, this is to notify you that your investment has received a credit transaction of ROI of ${userDetails.currency_type+amt_send} occurred in your account, Please contact your account officer if there is any irregularity for immediate intervention.`,
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
                                                <img src="https://rugipofinance.onrender.com/images/RAF_LOGO.png" width="100" height="100"/>&nbsp;</a></p>
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
                            <img src="https://img.icons8.com/ios/50/null/money-bag.png" style="display: block; border: 0px;" /><br>
                                <h2 style="font-size: 25px; font-weight: 600; line-height: 25px; color: #333333; margin: 0;">
                                  ROI Credit Notification
                                </h2>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                Hello ${userDetails.first_name}, this is to notify you that your investment has received a credit transaction for ROI of ${userDetails.currency_type+amt_send} occurred in your account. <br> Please contact your account officer if there is any irregularity for immediate intervention.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td colspan="2" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                        Transaction Details
                                    </td>
                                </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            Investment Type
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                            ${req.body.invest_type}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                           Investment Plan
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${req.body.invest_plan}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Period 
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            ${investDetails.investment_duration}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Status 
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Successful
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                            Date 
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;">
                                           ${ req.body.credit_date}
                                        </td>
                                    </tr>

                                    
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="left" style="padding-top: 20px;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                            Amount
                                        </td>
                                        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;">
                                            ${userDetails.currency_type}${new Intl.NumberFormat().format(req.body.sending_amt)}
                                        </td>
                                    </tr>
                                </table>
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
                                    Contact support for any irregularity.
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
  };
    sgMail.send(messageBody).then((response) => console.log('Message Response: ', response.message))
    .catch((err) => console.log(err.message));

      res.status(201).send({ msg: "201" });
    }

    //fundsend.createdBy = (User._id); // get current user ID
  } catch (err) {
    res.status(500).send({ msg: "500" });
    console.log(err);
  }
});

  module.exports = router;