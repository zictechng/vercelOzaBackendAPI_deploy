const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const currencyFormatter = require('currency-formatter');
const paypal = require('paypal-rest-sdk');
var fetch = require('node-fetch');
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');
const AppSetting = require('../models/AppSettingDetails')
const TransfersHistory = require('../models/fundTransfer')
const FundUserAccount = require('../models/fundAccount')
const SystemActivity = require('../models/SystemActivityLogs');
const Notification = require('../models/NotificationAlert');
const GetRate = require('../models/businessRate')
const nodemailer = require("nodemailer");
const transporter = require('../controllers/mailSender');
const { isAuth } = require('../middleware/auth');
const moment = require('moment');
const { transactEmail, transactEmailText } = require('../emailTemplate/emailRegister');
const { loginEmail, loginText } = require('../emailTemplate/emailLogin');
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
// get dates and format it
var now = new Date();
var dateString = moment(now).format('YYYY-MM-DD');

var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
// all transaction routes goes here...

// generate transaction ID Code here
function generateRandomNumber() {
    return Math.floor(1000000 + Math.random() * 9000000);
    }
    var appName = '';
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
  
// paypal checkout routes goes here

paypal.configure({
    'mode': process.env.PAYPAL_MODE,
    'client_id': process.env.PAYPAL_KEY,
    'client_secret': process.env.PAYPAL_SECRET,
  });
  
  var newAmt = null;
  var passDetails = '';

router.post('/create-payment', isAuth, (req, res, next) => {
    const { amount, currency } = req.body;
    const {tag_id,myId,sell_note,serviceName,serviceCategory,method} = req.body;
    if(amount == null || amount == '' || amount ==undefined){
        return res.status(500).json({ error: 'Invalid request! User reload the page' });
    }
    var receiveAmt = amount;
    newAmt = receiveAmt;
    const amt = req.body.amount;
   // console.log('body details', req.body);
    passDetails = req.body;

    const createPaymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal',
      },
      redirect_urls: {
        return_url: process.env.SERVER_BASEURL+'/api/success',
        cancel_url: process.env.SERVER_BASEURL+'/api/cancel',
      },
      transactions: [{
        item_list: {
          items: [{
            name: 'OZA Paypal payment transaction',
            sku: 'OZA-PAYPAL',
            price: amt,
            currency: currency,
            quantity: 1,
          }],
        },
        amount: {
          currency: "USD",
          total: amt,
        },
        description: 'Paypal funds exchange payment request',
      }],
    };

paypal.payment.create(createPaymentJson, (error, payment) => {
      if (error) {
        console.error('PayPal Payment Error:', error.response);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            res.json({ approvalUrl: payment.links[i].href });
          }
        }
      }
    });
});
  
  // success route here
router.get('/success', (req, res) => {
    // Handle successful payment execution here
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const payToken = req.query.token;

//console.log("payerId",payerId, "paymentId ", paymentId, "Payment token", payToken); 
  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": newAmt
        }
    }]  
  };
  
  if(payerId == null || paymentId==null || payToken ==null){
    return res.status(500).json({ error: 'Internal Server Error' });
  }
paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
        console.log("error",error.response);
        return res.status(500).json({ error: 'Internal Server Error' });
        throw error;
    } else {
        //console.log("success ID ", req.query)
        // the custom function to execute the payment record details creation here
        processPaymentDetails(passDetails, paymentId)
        res.send('Payment successful')
//res.sendFile(__dirname + "/successful.html")
    }
    });
  });

router.get('/cancel', (req, res) => {
    // Handle canceled payment here
    res.send('Payment canceled.');
  });

  // custom function to create payment details history record here
const processPaymentDetails = async(data, paymentId) =>{
    const TransID = transactionID(25)
       
    const getCurrentRate = await GetRate.findOne();
    try {
        let userFund = await User.findOne({ _id: data.myId }); // here I am checking if user exist then I will get user details
        if (!userFund) {
          //console.log("User details: ", userDetails)
          return res.json({status: 404, message: 'User not found'})// user not found
        } 
        else if (userFund){
            // create record for funding purposes
            const createRecord = TransferFund.create({
              acct_name: userFund.display_name,
              acct_number: userFund.tag_id,
              amount: data.amount,
              bank_name: '',
              sender_name: userFund.display_name,
              sender_acct_number: userFund.tag_id,
              sender_currency_type: '$',
              tran_type: 'Credit',
              transac_nature:data.serviceName+' '+data.serviceCategory,
              transac_category: data.serviceName,
              tran_desc:'Request for virtual funds exchange with '+data.serviceName+" \n "+data.sell_note,
              tr_year:'',
              colorcode:'green',
              trans_method: data.method,
              currency_level:'2',
              createdBy: data.myId,
              tid: TransID,
              trans_balance: data.total_money,
              tran_service_type: data.serviceType,
              pay_tran: paymentId,
              tran_rate: data.serviceName == 'PayPal'? getCurrentRate.paypal_selling: data.serviceName == 'Payoneer'? getCurrentRate.payooner_selling: data.serviceName=='Bitcoin'? getCurrentRate.btc_selling: ''
              });
              
            // check if user activate in-app notification and send notification
            if(userFund.receive_app_message == true) {
               const userLogs = Notification.create({
                alert_username: userFund.display_name,
                alert_name: userFund.display_name,
                alert_user_ip: '',
                alert_country: '',
                alert_browser: '',
                alert_date:  Date.now(),
                alert_user_id: userFund._id,
                alert_nature: 'Request for virtual funds exchange with '+data.serviceName,
                alert_status: 1,
                alert_read_date: ''
                })
            }

            // create log here
            const addLogs = await SystemActivity.create({
              log_username: userFund.email,
              log_name: userFund.display_name,
              log_acct_number: userFund?.tag_id,
              log_receiver_name: '',
              log_receiver_number: '',
              log_receiver_bank: '',
              log_country: '',
              log_swift_code: '',
              log_desc:'Funds exchange request made',
              log_amt: '',
              log_status: 'Successful',
              log_nature:'Fund exchange request',
              })
            // check if the user activate email notification and send notification
            if(userFund.receive_email_notification == true){
               // send email notification to user
               fetchApp().then((result) =>{
                appName = result.app_name
                const mailBody = loginEmail(appName, 'Payment notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \n 
                Order ID is ${paymentId} Thank you`)
                const mailText = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n Order ID is ${paymentId}`)
                let payPal_mailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: userFund.email,
                    subject: 'Payment notification!',
                    text: mailText,
                    html: mailBody,
                }
                async function main() {
                    const info = await transporter.sendMail(payPal_mailOptions);
                    }
                main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))
               
            }       
       // success message
            }
        } catch (err) {
        // err message
        console.log(err)
        // return res.json({status: 500, message: 'Technical issues occurred' })
        }
    }
  
 // user request route to send fund to other user account goes here...
 router.post("/userSending_funding", isAuth, async (req, res) => {
    const dataReceive = req.body;
    //console.log("My Blocked ID: ", req.body)
    const Trans_ID = transactionID(25)
  
    // get the transfer record ID here
    const filter = { _id: dataReceive.userId };
        if (dataReceive.userId == "" || dataReceive.userId == null) {
         return res.status(401).send({ message: "Invalid user access" }); // cot code required
        }
    try {
          let userFund = await User.findOne({ _id:  dataReceive.userId }); // here I am checking if user exist then I will get user details
          let receiverUser = await User.findOne({ tag_id:  dataReceive.tagId });
          const filterReceiver = { _id: receiverUser._id };
          
          if(!receiverUser){
            return res.json({status: 404, message: 'Receiver record not found' })
          }
          if (!userFund) {
            //console.log("User details: ", userDetails)
            return res.json({status: 401, message: 'Invalid access' }) // user not found
          } 
          else if (userFund){
            const userCurrentBalance = userFund.amount - dataReceive.amt
            //const userBalance = userDetails.amount+ +amt_send
  
            console.log("Current balance: ", userCurrentBalance)
                if(userFund.acct_cot_pin !== dataReceive.acctPin){
                  console.log("wrong Pin id: ")
                  return res.json({status: 404, message: 'Invalid Pin entered' }) // wrong pin
                }
  
              if(userFund.amount < dataReceive.amt){
                return res.json({status: 404, message: 'Low balance ' }) // low balance
              }
  
              const currentReceiverBal = receiverUser.amount+ +dataReceive.amt
             
              // update sender balance
              const updateSenderBalance = {
                $set: {
                  amount: userCurrentBalance,
                  last_transaction: dataReceive.amt,
                  acct_balance: userCurrentBalance,
                },
              };
  
              //update receiver balance
              const updateReceiverBalance = {
                $set: {
                  amount: currentReceiverBal,
                  last_transaction: dataReceive.amt,
                  acct_balance: currentReceiverBal,
                },
              };
  
              const updateSender = await User.updateOne(filter, updateSenderBalance);
  
              const updateReceiver = await User.updateOne(filterReceiver, updateReceiverBalance);
  
              // create record for receiver history purposes
              const fundAccount = TransferFund.create({
                acct_name: receiverUser.display_name,
                acct_number: receiverUser.tag_id,
                amount: req.body.amt,
                sender_name: userFund.display_name,
                tran_type: 'Credit',
                transac_nature: 'In-app Credit',
                tran_desc: req.body.note,
                trans_balance: currentReceiverBal,
                createdBy: receiverUser._id,
                tid: Trans_ID,
                colorcode:'green',
                sender_acct_number: userFund.tag_id,
                transaction_status: 'Successful',
                createdOn: Date.now(),
              });
              // create record for sender history purposes
              const TransfersHistory = TransferFund.create({
                acct_name: userFund.display_name,
                acct_number: userFund.tag_id,
                amount: req.body.amt,
                sender_name: userFund.display_name,
                tran_type: 'Debit',
                transac_nature: 'In-app Debit',
                tran_desc: req.body.note,
                trans_balance: userCurrentBalance,
                createdBy: userFund._id,
                tid: Trans_ID,
                colorcode:'red',
                sender_acct_number: userFund.tag_id,
                transaction_status: 'Successful',
                createdOn: Date.now(),
              });
              // check if user activate in-app notification and send notification
              if(userFund.receive_app_message == true) {
                 const userLogs = Notification.create({
                  alert_username: userFund.display_name,
                  alert_name: userFund.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date:  Date.now(),
                  alert_user_id: userFund._id,
                  alert_nature: 'Your transaction of '+ dataReceive.amt+ ' was successful!',
                  alert_status: 1,
                  alert_read_date: ''
                  })
              }
  
              // check if receiver user activate in-app notification and send notification
              if(receiverUser.receive_app_message == true) {
                const userLogs = Notification.create({
                 alert_username: receiverUser.display_name,
                 alert_name: receiverUser.display_name,
                 alert_user_ip: '',
                 alert_country: '',
                 alert_browser: '',
                 alert_date:  Date.now(),
                 alert_user_id: receiverUser._id,
                 alert_nature: 'Your account was credited with '+ dataReceive.amt+ ' and it was successful!',
                 alert_status: 1,
                 alert_read_date: ''
                 })
             }
  
              // create log here
              const addLogs = await SystemActivity.create({
                log_username: userFund.email,
                log_name: userFund.display_name,
                log_acct_number: userFund?.tag_id,
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Transfer funding request made',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Transfer request',
                })
              // check if the sender user activate email notification and send notification
              if(userFund.receive_email_notification === true){
                 // send email notification to user
                 fetchApp().then((result) =>{
                    appName = result.app_name
                    const mailBody = transactEmail(appName, 'Account Debit Notification', userFund.display_name, `this is to notify you that your transfer request was successful and your account has been debited with`, req.body.amt, Trans_ID)
                    const TextBody = transactEmailText(userFund.display_name, `this is to notify you that your transfer request was successful and your account has been debited with`, req.body.amt, Trans_ID );
                    let sendFundMailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: userFund.email,
                    subject: 'Account Debit Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                    const info = await transporter.sendMail(sendFundMailOptions);
                    }
                 main().catch('Message Error', console.error);
                    }).catch(console.error.bind(console))
                   
              }  
              // check if the receiver user activate email notification and send notification
              if(receiverUser.receive_email_notification == true){
                // send email notification to user
                fetchApp().then((result) =>{
                    appName = result.app_name
                    const mailBody = transactEmail(appName, 'Account Credit Notification', receiverUser.display_name, `this is to notify you that your account was credited with `, req.body.amt, Trans_ID)
                    const TextBody = transactEmailText(receiverUser.display_name, `this is to notify you that your account was credited with`, req.body.amt, Trans_ID);
                    let getFundMailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: receiverUser.email,
                    subject: 'Account Credit Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                    const info = await transporter.sendMail(getFundMailOptions);
                    }
                 main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))     
             }  
         // success message
          res.status(201).json({msg: '200'})
          }
      } catch (err) {
         // err message
       console.log(err)
        return res.json({status: 500, message: 'Technical issues occurred' })
     }
  });

    // user request route to fund account goes here...
router.post("/userAccount_funding", isAuth, async (req, res) => {
    const dataReceive = req.body;
    //console.log("Tran ID: ", req.body)
    const Trans_ID = transactionID(25)
    // get the transfer record ID here
    const filter = { _id: dataReceive.userId };
        if (dataReceive.userId == "" || dataReceive.userId == null) {
         return res.status(401).send({ message: "Invalid user access" }); // cot code required
        }

          const fundingLimit = await AppSetting.find();
          if(dataReceive.amt > fundingLimit[0].app_maxi_funding ){
            return res.json({status: 403, message: `Amount funding should not exceed \u20A6${new Intl.NumberFormat().format(fundingLimit[0].app_maxi_funding)}` })
          }
          if(dataReceive.amt < fundingLimit[0].app_minim_funding ){
            return res.json({status: 403, message: `Minimum of amount of \u20A6${new Intl.NumberFormat().format(fundingLimit[0].app_minim_funding)} accepted` })
          }

          //console.log("maxi ", fundingLimit[0].app_maxi_funding)
    try {
          
          //console.log("All App ", fundingLimit)

          let userFund = await User.findOne({ _id:  dataReceive.userId }); // here I am checking if user exist then I will get user details
          if (!userFund) {
            //console.log("User details: ", userDetails)
            res.status(404).send({ message: 'User not found' }); // user not found
          } 
          else if (userFund){
        
              // create record for funding purposes
              const fundAccount = FundUserAccount.create({
                fund_name: userFund.display_name,
                fund_number: Trans_ID,
                fund_tag_id: userFund.tag_id,
                amount: dataReceive.amt,
                fund_email: userFund.email,
                fund_note: dataReceive.note,
                fund_status: 'Pending',
              });
              // check if user activate in-app notification and send notification
              if(userFund.receive_app_message == true) {
                 const userLogs = Notification.create({
                  alert_username: userFund.display_name,
                  alert_name: userFund.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date: Date.now(),
                  alert_user_id: userFund._id,
                  alert_nature: 'Account funding request submitted! Your wallet will be funded once confirmed payment!',
                  alert_status: 1,
                  alert_read_date: ''
                  })
              }
              // create record for sender history purposes
              const TransfersHistory = TransferFund.create({
                acct_name: userFund.display_name,
                acct_number: userFund.tag_id,
                amount: req.body.amt,
                sender_name: userFund.display_name,
                tran_type: 'Credit',
                transac_nature: 'In-app funding',
                tran_desc: req.body.note,
                createdBy: userFund._id,
                tid: Trans_ID,
                colorcode:'green',
                pay_tran: req.body.payId,
                sender_acct_number: userFund.tag_id,
                transaction_status: 'Pending',
                createdOn: Date.now(),
              });

              // create log here
              const addLogs = await SystemActivity.create({
                log_username: userFund.email,
                log_name: userFund.display_name,
                log_acct_number: userFund?.tag_id,
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Account funding request made',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Funding request',
                })
              // check if the user activate email notification and send notification
              if(userFund.receive_email_notification == true){
                 // send email notification to user
                 fetchApp().then((result) =>{
                    appName = result.app_name
                    const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as we confirm your payment status. \n Account funding Transaction ID is ${Trans_ID}, \n 
                    Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n Thank you`)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as your payment received. \n Transaction ID is ${Trans_ID} \n
                    Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                    let fundAcctMailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: userFund.email,
                    subject: 'Account Funding Notification!',
                    text: TextBody,
                    html: mailBody,
                   }
                   // async..await is not allowed in global scope, must use a wrapper
                   async function main() {
                       const info = await transporter.sendMail(fundAcctMailOptions);
                       }
                    main().catch('Message Error', console.error);
                    }).catch(console.error.bind(console))    
              }       
         // success message
          res.status(200).json({msg: '200'})
          }
      } catch (err) {
         // err message
       console.log(err)
        return res.json({status: 500, message: 'Technical issues occurred' })
     }
  });

// route to check funding limit before sending it for processing goes here...
router.post("/check_fundingLimit", isAuth, async (req, res) => {
  const dataReceive = req.body;
  console.log("Tran ID: ", req.body)
  const Trans_ID = transactionID(25)
  // get the transfer record ID here
  const filter = { _id: dataReceive.userId };
      if (dataReceive.userId == "" || dataReceive.userId == null) {
       return res.status(401).send({ message: "Invalid user access" }); // cot code required
      }
    try {
        //console.log("All App ", fundingLimit)
        const fundingLimit = await AppSetting.find();
        if(dataReceive.amt > fundingLimit[0].app_maxi_funding ){
          return res.json({status: 403, message: `Amount funding should not exceed \u20A6${new Intl.NumberFormat().format(fundingLimit[0].app_maxi_funding)}` })
        }
        if(dataReceive.amt < fundingLimit[0].app_minim_funding ){
          return res.json({status: 403, message: `Minimum of amount of \u20A6${new Intl.NumberFormat().format(fundingLimit[0].app_minim_funding)} accepted` })
        }
        
        else{       
       // success message
        res.status(200).json({msg: '200'})
        }
      } catch (err) {
       // err message
     console.log(err)
      return res.json({status: 500, message: 'Technical issues occurred' })
   }
});

// process user sales/purchase request fund goes here...
router.post("/fundPurchase_funding", isAuth, async (req, res) => {
    const dataReceive = req.body;
    //console.log("My data: ", req.body)
    const TransID = transactionID(25)
    // get the transfer record ID here
    const filter = { _id: dataReceive.myId };
        if (dataReceive.myId == "" || dataReceive.myId == null) {
        return res.json({status: 401, message: 'Invalid user access'})
        }
        const getCurrentRate = await GetRate.findOne();
    try {
          let userFund = await User.findOne({ _id:  dataReceive.myId }); // here I am checking if user exist then I will get user details
          if (!userFund) {
            //console.log("User details: ", userDetails)
            return res.json({status: 404, message: 'User not found'})// user not found
          } 
          else if (userFund){
        
              // create record for funding purposes
              const createRecord = TransferFund.create({
                acct_name: userFund.display_name,
                acct_number: userFund.tag_id,
                amount: dataReceive.sell_amt,
                bank_name: '',
                sender_name: userFund.display_name,
                sender_acct_number: userFund.tag_id,
                sender_currency_type: '$',
                tran_type: 'Credit',
                transac_nature:dataReceive.serviceName+' '+dataReceive.serviceCategory,
                transac_category: dataReceive.serviceName,
                tran_desc:'Request for virtual funds exchange with '+dataReceive.serviceName+" \n "+dataReceive.sell_note,
                tr_year:'',
                colorcode:'green',
                trans_method: dataReceive.method,
                currency_level:'2',
                createdBy: dataReceive.myId,
                trans_balance: dataReceive.total_money,
                tid: TransID,
                tran_service_type: dataReceive.serviceType,
                pay_tran: dataReceive.method =='Paystack Checkout'? dataReceive.payId : null,
                tran_rate: dataReceive.serviceName == 'PayPal'? getCurrentRate.paypal_buying: dataReceive.serviceName == 'Payoneer'? getCurrentRate.payooner_buying: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_buying: ''
                });
                
              // check if user activate in-app notification and send notification
              if(userFund.receive_app_message == true) {
                 const userLogs = Notification.create({
                  alert_username: userFund.display_name,
                  alert_name: userFund.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date:  Date.now(),
                  alert_user_id: userFund._id,
                  alert_nature: 'Request for virtual funds exchange with '+dataReceive.serviceName,
                  alert_status: 1,
                  alert_read_date: ''
                  })
              }
  
              // create log here
              const addLogs = await SystemActivity.create({
                log_username: userFund.email,
                log_name: userFund.display_name,
                log_acct_number: userFund?.tag_id,
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Funds exchange request made',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Fund exchange request',
                })
              // check if the user activate email notification and send notification
              if(userFund.receive_email_notification == true){
                 // send email notification to user
                 fetchApp().then((result) =>{
                    appName = result.app_name
                    const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \nThank you`)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID}`);
                    let fundAcctMailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: userFund.email,
                    subject: 'Account Funding Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                    const info = await transporter.sendMail(fundAcctMailOptions);
                    }
                 main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))
                 
              }       
         // success message
          res.status(201).json({msg: '200', feedback: TransID})
          }
      } catch (err) {
         // err message
       console.log(err)
        return res.json({status: 500, message: 'Technical issues occurred' })
     }
  });

  // process user sales/purchase request fund goes here...
router.post("/fundBuy_funding", isAuth, async (req, res) => {
    const dataReceive = req.body;
    //console.log("My data: ", req.body)
    const TransID = transactionID(25)
    const nowRate = '';
    // get the transfer record ID here
    const filter = { _id: dataReceive.myId };
        if (dataReceive.myId == "" || dataReceive.myId == null) {
        return res.json({status: 401, message: 'Invalid user access'})
        }
        const getCurrentRate = await GetRate.findOne();
        
    try {
          let userFund = await User.findOne({ _id:  dataReceive.myId }); // here I am checking if user exist then I will get user details
          if (!userFund) {
            //console.log("User details: ", userDetails)
            return res.json({status: 404, message: 'User not found'})// user not found
          } 
          else if (userFund){
              // create record for funding purposes
              const createRecord = TransferFund.create({
                acct_name: userFund.display_name,
                acct_number: userFund.tag_id,
                amount: dataReceive.buy_amt,
                bank_name: '',
                sender_name: userFund.display_name,
                sender_acct_number: userFund.tag_id,
                sender_currency_type: '$',
                tran_type: 'Debit',
                transac_nature:dataReceive.serviceName+' '+dataReceive.serviceCategory,
                transac_category: dataReceive.serviceName,
                tran_desc:'Request for virtual funds exchange with '+dataReceive.serviceName+" \n "+dataReceive.buy_note,
                tr_year:'',
                colorcode:'red',
                trans_method: dataReceive.method,
                currency_level:'2',
                createdBy: dataReceive.myId,
                tid: TransID,
                tran_service_type: dataReceive.serviceType,
                trans_balance: dataReceive.total_money,
                pay_tran: dataReceive.method =='Paystack Checkout'? dataReceive.payId : null,
                tran_rate: dataReceive.serviceName == 'PayPal'? getCurrentRate.paypal_buying: dataReceive.serviceName == 'Payoneer'? getCurrentRate.payooner_buying: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_buying: ''
                });
                
              // check if user activate in-app notification and send notification
              if(userFund.receive_app_message == true) {
                 const userLogs = Notification.create({
                  alert_username: userFund.display_name,
                  alert_name: userFund.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date:  Date.now(),
                  alert_user_id: userFund._id,
                  alert_nature: 'Request for virtual funds exchange with '+dataReceive.serviceName,
                  alert_status: 1,
                  alert_read_date: ''
                  })
              }
  
              // create log here
              const addLogs = await SystemActivity.create({
                log_username: userFund.email,
                log_name: userFund.display_name,
                log_acct_number: userFund?.tag_id,
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Funds exchange request made',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Fund exchange request',
                })
              // check if the user activate email notification and send notification
              if(userFund.receive_email_notification == true){
                 // send email notification to user
                 fetchApp().then((result) =>{
                    appName = result.app_name
                    const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment is received. \n Request reference / Transaction ID is ${TransID}, \n
                    \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId: ''}
                    \n Thank you`)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId:''}`);
                    let fundAcctMailOptions = {
                    from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                    to: userFund.email,
                    subject: 'Account Funding Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                // async..await is not allowed in global scope, must use a wrapper
                async function main() {
                    const info = await transporter.sendMail(fundAcctMailOptions);
                    }
                 main().catch('Message Error', console.error);
                 }).catch(console.error.bind(console))
               }       
         // success message
          res.status(201).json({msg: '200', feedback: TransID})
          }
      } catch (err) {
         // err message
       console.log(err)
        return res.json({status: 500, message: 'Technical issues occurred' })
     }
  });

  // process user sales/purchase request fund goes here...
router.post("/fetch_AccountDetailsMobile", async (req, res) => {
  const dataReceive = req.body;
  // get the transfer record ID here
  const filter = { _id: dataReceive.myId };
      if (dataReceive == "" || dataReceive == null) {
      return res.json({status: 404, message: 'Invalid data'})
      }
      
  try {
    let receiverUser = await User.findOne({ tag_id:  req.body.data }); // here I am checking if user exist then I will get user details
    
    if (!receiverUser) {
          //console.log("User details: ", userDetails)
          return res.json({status: 404, message: 'User not found'})// user not found
        } 
        else if (receiverUser){
          console.log("User details: ", receiverUser.display_name)
       // success message
        res.json({msg: '200', userData: receiverUser.display_name})
        }
    } catch (err) {
       // err message
     console.log(err)
      return res.json({status: 500, message: 'Technical issues occurred' })
   }
});

  // process user sales/purchase request fund goes here...
router.post("/paypal_checkout", isAuth, async (req, res) => {
    const dataReceive = req.body;
    console.log("My data: ", req.body)
    const TransID = transactionID(25)
    const nowRate = '';
    // get the transfer record ID here
    const filter = { _id: dataReceive.myId };
        if (dataReceive.myId == "" || dataReceive.myId == null) {
        return res.json({status: 401, message: 'Invalid user access'})
        }
        const getCurrentRate = await GetRate.findOne();
        
    try {
          let userFund = await User.findOne({ _id:  dataReceive.myId }); // here I am checking if user exist then I will get user details
          if (!userFund) {
            //console.log("User details: ", userDetails)
            return res.json({status: 404, message: 'User not found'})// user not found
          } 
          else if (userFund){
              // create record for funding purposes
              const createRecord = TransferFund.create({
                acct_name: userFund.display_name,
                acct_number: userFund.tag_id,
                amount: dataReceive.amt,
                bank_name: '',
                sender_name: userFund.display_name,
                sender_acct_number: userFund.tag_id,
                sender_currency_type: '$',
                tran_type: 'Credit',
                transac_nature:dataReceive.serviceName+' '+dataReceive.serviceCategory,
                transac_category: dataReceive.serviceName,
                tran_desc:'Request for virtual funds exchange with '+dataReceive.serviceName+" \n "+dataReceive.sell_note,
                tr_year:'',
                colorcode:'green',
                trans_method: dataReceive.method,
                currency_level:'2',
                createdBy: dataReceive.myId,
                tid: TransID,
                pay_tran: dataReceive.orderId,
                tran_rate: dataReceive.serviceName == 'PayPal'? getCurrentRate.paypal_selling: dataReceive.serviceName == 'Payoneer'? getCurrentRate.payooner_selling: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_selling: ''
                });
                
              // check if user activate in-app notification and send notification
              if(userFund.receive_app_message == true) {
                 const userLogs = Notification.create({
                  alert_username: userFund.display_name,
                  alert_name: userFund.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date:  Date.now(),
                  alert_user_id: userFund._id,
                  alert_nature: 'Request for virtual funds exchange with '+dataReceive.serviceName,
                  alert_status: 1,
                  alert_read_date: ''
                  })
              }
  
              // create log here
              const addLogs = await SystemActivity.create({
                log_username: userFund.email,
                log_name: userFund.display_name,
                log_acct_number: userFund?.tag_id,
                log_receiver_name: '',
                log_receiver_number: '',
                log_receiver_bank: '',
                log_country: '',
                log_swift_code: '',
                log_desc:'Funds exchange request made',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Fund exchange request',
                })
              // check if the user activate email notification and send notification
              if(userFund.receive_email_notification == true){
                 // send email notification to user
                 fetchApp().then((result) =>{
                appName = result.app_name
                const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \n 
                 Order ID is ${dataReceive.orderId} Thank you`)
                 const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n Order ID is ${dataReceive.orderId}`);
                 let acctFundMailOptions = {
                 from: `${appName} <noreply@rugipoalumni.zictech-ng.com>`,
                 to: userFund.email,
                 subject: 'Account Funding Notification!',
                 text: TextBody,
                 html: mailBody,
             }
             // async..await is not allowed in global scope, must use a wrapper
             async function main() {
                 const info = await transporter.sendMail(acctFundMailOptions);
                 }
              main().catch('Message Error', console.error);
                }).catch(console.error.bind(console))
             }       
         // success message
          res.status(201).json({msg: '200'})
          }
      } catch (err) {
         // err message
       console.log(err)
        return res.json({status: 500, message: 'Technical issues occurred' })
     }
  });

module.exports = router;