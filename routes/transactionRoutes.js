const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const mailTransporter = require('../controllers/emailSender');
const paypal = require('paypal-rest-sdk');
var fetch = require('node-fetch');
const transporterMailer = require('../controllers/signupMailer');
const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');
const AppSetting = require('../models/AppSettingDetails')
const FundUserAccount = require('../models/fundAccount')
const SystemActivity = require('../models/SystemActivityLogs');
const Notification = require('../models/NotificationAlert');
const GetRate = require('../models/businessRate');
const UserWithdrawal = require('../models/withdrawalRequest');

//const transporter = require('../controllers/mailSender');
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
                appLogo = result.app_logo
                const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                const mailBody = loginEmail(appName, 'Payment notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \n 
                Order ID is ${paymentId} Thank you`, logoImage)
                const mailText = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n Order ID is ${paymentId}`)
                let payPal_mailOptions = {
                    from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                    to: [{ email: userFund.email }],
                    subject: 'Payment notification!',
                    text: mailText,
                    html: mailBody,
                }
                mailTransporter.send(payPal_mailOptions).then(console.log)
	                .catch('Email Sending Error ', console.error);
               }).catch(console.error.bind(console))
               
            }  
            // send email notification to admin
            fetchApp().then((result) =>{
              appName = result.app_name
              appLogo = result.app_logo
              const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
              const mailBody = loginEmail(appName, 'Paypal Fund notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} as requested for fund exchanging. \n Request reference / Transaction ID is ${TransID}, \n 
              Order ID is ${paymentId} Thank you`, logoImage)
              const mailText = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n Order ID is ${paymentId}`)
              let payPal_mailOptions = {
                  from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                  to: [{ email: 'hello@ozaapp.com'}],
                  subject: 'Payment notification!',
                  text: mailText,
                  html: mailBody,
              }
                mailTransporter.send(payPal_mailOptions).then(console.log)
	                .catch('Email Sending Error ', console.error);

              }).catch(console.error.bind(console))     
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
    const Trans_ID = transactionID(25);
   
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
            //console.log("Current balance: ", userCurrentBalance)
                if(userFund.acct_cot_pin !== dataReceive.acctPin){
                  //console.log("wrong Pin id: ")
                  return res.json({status: 404, message: 'Invalid Pin entered' }) // wrong pin
                }

              if(userFund.amount < dataReceive.amt){
                return res.json({status: 404, message: 'Low balance ' }) // low balance
              }
              //sender account sending source check
              if(dataReceive.account_source == '1')
              {
                var senderBalance = userFund.amount - dataReceive.amt;
                 // update sender balance
                var updateSenderBalance = {
                  $set: {
                    amount: senderBalance,
                    last_transaction: dataReceive.amt,
                    acct_balance: senderBalance,
                  },
                };
              }
              else if(dataReceive.account_source == '2')
              {
                var senderBalance  = userFund.all_bonus_acct - dataReceive.amt
                 // update sender balance
              var updateSenderBalance = {
                $set: {
                  all_bonus_acct: senderBalance,
                  last_transaction: dataReceive.amt,
                  acct_balance: senderBalance,
                },
              };
              }
                            
              // receiver balance check
              if(dataReceive.account_source == '1')
                {
                  var currentReceiverBal = receiverUser.amount+ +dataReceive.amt
                  //update receiver balance
                    var updateReceiverBalance = {
                      $set: {
                        amount: currentReceiverBal,
                        last_transaction: dataReceive.amt,
                        acct_balance: currentReceiverBal,
                      },
                    };
                }
                else if(dataReceive.account_source == '2')
                {
                  var currentReceiverBal = receiverUser.all_bonus_acct+ +dataReceive.amt
                  var updateReceiverBalance = {
                    $set: {
                      all_bonus_acct: currentReceiverBal,
                      last_transaction: dataReceive.amt,
                      acct_balance: currentReceiverBal,
                    },
                  };
                }
                
              //console.log(currentReceiverBal)
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
                currency_level: dataReceive.account_source == '2'?'2':'',
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
                trans_balance: senderBalance,
                createdBy: userFund._id,
                tid: Trans_ID,
                colorcode:'red',
                currency_level: dataReceive.account_source == '2'?'2':'',
                sender_acct_number: userFund.tag_id,
                transaction_status: 'Successful',
                createdOn: Date.now(),
              });
              // check if sender user activate in-app notification and send notification
              if(userFund.receive_app_message == true) {
                 const userLogs = Notification.create({
                  alert_username: userFund.display_name,
                  alert_name: userFund.display_name,
                  alert_user_ip: '',
                  alert_country: '',
                  alert_browser: '',
                  alert_date:  Date.now(),
                  alert_user_id: userFund._id,
                  alert_nature: `Your transaction of ${dataReceive.account_source == '2'? `\$${new Intl.NumberFormat().format(dataReceive.amt)}`:`\u20A6${new Intl.NumberFormat().format(dataReceive.amt)}`}.\nWith transaction ID: ${Trans_ID} \nTo ${receiverUser.display_name} was successful.`,
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
                 alert_nature: `Your account was credited with ${dataReceive.account_source == '2'? `\$${new Intl.NumberFormat().format(dataReceive.amt)}`:`\u20A6${new Intl.NumberFormat().format(dataReceive.amt)}`}.\nWith transaction ID: ${Trans_ID} \nFrom ${userFund.display_name}.`,
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
                log_desc:'Funds transfer request made',
                log_amt: '',
                log_status: 'Successful',
                log_nature:'Transfer request',
                })
              // check if the sender user activate email notification and send notification
              if(userFund.receive_email_notification === true){
                 // send email notification to user
                 fetchApp().then((result) =>{
                    appName = result.app_name
                    appLogo = result.app_logo
                    const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                    const mailBody = transactEmail(appName, 'Account Debit Notification', userFund.display_name, `this is to notify you that your transfer request of
                      <b>${dataReceive.account_source == '2'? `\$${new Intl.NumberFormat().format(req.body.amt)}`:`\u20A6${new Intl.NumberFormat().format(req.body.amt)}`}</b> to
                      ${receiverUser.display_name} was successful and your account has been debited.
                      `, '', Trans_ID, logoImage)
                    const TextBody = transactEmailText(userFund.display_name, `this is to notify you that your transfer request was successful and your account has been debited with <b>${dataReceive.account_source == '2'? `\$${new Intl.NumberFormat().format(req.body.amt)}`:`\u20A6${new Intl.NumberFormat().format(req.body.amt)}`} '</b> <br>`, Trans_ID );
                    let sendFundMailOptions = {
                    from: { name: `${appName + ' Support'}`, email: '<noreply@ozaapp.com>' },
                    to: [{ email: userFund.email }],
                    subject: 'Account Debit Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                  mailTransporter.send(sendFundMailOptions).then(console.log)
	                  .catch('Email Sending Error ', console.error);

                // async..await is not allowed in global scope, must use a wrapper
               }).catch(console.error.bind(console))
                   
              }  
              // check if the receiver user activate email notification and send notification
              if(receiverUser.receive_email_notification == true){
                // send email notification to user
                fetchApp().then((result) =>{
                    appName = result.app_name
                    appLogo = result.app_logo
                    const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                    const mailBody = transactEmail(appName, 'Account Credit Notification', receiverUser.display_name, `this is to notify you that your account was credited with 
                      <b>${dataReceive.account_source == '2'? `\$${new Intl.NumberFormat().format(dataReceive.amt)}`:`\u20A6${new Intl.NumberFormat().format(dataReceive.amt)}`}</b>`, Trans_ID, logoImage)
                    const TextBody = transactEmailText(receiverUser.display_name, `this is to notify you that your account was credited with
                      <b>${dataReceive.account_source == '2'? `\$${new Intl.NumberFormat().format(dataReceive.amt)}`:`\u20A6${new Intl.NumberFormat().format(dataReceive.amt)}`}</b>`, Trans_ID);
                    let getFundMailOptions = {
                    from: { name: `${appName + ' Support'}`, email: '<noreply@ozaapp.com>' },
                    to: [{ email: receiverUser.email }],
                    subject: 'Account Credit Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                  mailTransporter.send(getFundMailOptions).then(console.log)
	                  .catch('Email Sending Error ', console.error);

                // async..await is not allowed in global scope, must use a wrapper
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
                transac_category:'Account Funding',
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
                    appLogo = result.app_logo
                    const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                    const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as we confirm your payment status. \n Account funding Transaction ID is ${Trans_ID}, \n 
                    Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n Thank you`, logoImage)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as your payment received. \n Transaction ID is ${Trans_ID} \n
                    Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                    let fundAcctMailOptions = {
                    from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                    to: [{ email: userFund.email }],
                    subject: 'Account Funding Notification!',
                    text: TextBody,
                    html: mailBody,
                   }
                    mailTransporter.send(fundAcctMailOptions).then(console.log)
	                  .catch('Email Sending Error ', console.error);

                   // async..await is not allowed in global scope, must use a wrapper
                    }).catch(console.error.bind(console))    
              }   
              // send email notification to admin
              fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                const mailBody = loginEmail(appName, 'Account Funding Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} has made account funding request and it has been logged! kindly treat as soon as possible. \n Account funding Transaction ID is ${Trans_ID}, \n 
                Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n Thank you`, logoImage)
                const TextBody = loginText(userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as your payment received. \n Transaction ID is ${Trans_ID} \n
                Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                let fundAcctMailOptions = {
                from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                to: [{ email: 'hello@ozaapp.com' }],
                subject: 'Account Funding Notification!',
                text: TextBody,
                html: mailBody,
              }
              mailTransporter.send(fundAcctMailOptions).then(console.log)
              .catch('Email Sending Error ', console.error);

              // async..await is not allowed in global scope, must use a wrapper
             }).catch(console.error.bind(console))        
         // success message
          
          res.status(200).json({msg: '200', feedback: Trans_ID})
          }
      } catch (err) {
         // err message
       console.log(err)
        return res.json({status: 500, message: 'Technical issues occurred' })
     }
  });

   // This route for user funds withdrawal request...
router.post("/userFundWithdrawal", isAuth, async (req, res) => {
  const dataReceive = req.body;
  //console.log("Tran ID: ", req.body)
  const Trans_ID = transactionID(25)
  // get the transfer record ID here
  const filter = { _id: dataReceive.userId };
      if (dataReceive.userId == "" || dataReceive.userId == null) {
       return res.status(401).send({ message: "Invalid user access" }); // cot code required
      }

        const fundingLimit = await AppSetting.find();
        let userFund = await User.findOne({ _id:  dataReceive.userId }); // here I am checking if user exist then I will get user details
        
        if(dataReceive.amt < fundingLimit[0]?.app_mini_withdrawal ){
          return res.json({status: 403, message: `Minimum withdrawal amount of \$${new Intl.NumberFormat().format(fundingLimit[0].app_mini_withdrawal)} accepted` })
        }
        if(dataReceive.amt > fundingLimit[0]?.app_maxi_withdrawal ){
          return res.json({status: 403, message: `Withdrawal amount should not exceed \$${new Intl.NumberFormat().format(fundingLimit[0].app_maxi_withdrawal)}` })
        }
        
  try {
        //console.log("All App ", fundingLimit)
        
        if (!userFund) {
          //console.log("User details: ", userDetails)
          return res.json({status: 404, message: 'User not found' }); // user not found
        } 
        if (userFund.all_bonus_acct < dataReceive.amt) {
          //console.log("User details: ", userDetails)
          return res.json({status: 403, message: 'insufficient  balance '})
          
        }
        else if (userFund){
          // check user bonus balance
          const currentBal = (userFund.all_bonus_acct - dataReceive.amt)
          
          const currentAllWithdrawal = (userFund.all_withdraw_acct+ +dataReceive.amt)
              // update balance
              const updateUserBalance = {
                $set: {
                  all_bonus_acct: currentBal,
                  last_transaction: dataReceive.amt,
                  all_withdraw_acct: currentAllWithdrawal,
                },
              };   
            // create record for funding purposes
            const fundAccount = UserWithdrawal.create({
              withdrawal_name: userFund.display_name,
              withdrawal_tid: Trans_ID,
              withdrawal_tag_id: userFund.tag_id,
              amount: dataReceive.amt,
              withdrawal_email: userFund.email,
              withdrawal_note: dataReceive.note,
              addeby: userFund._id,
            });

            const updateBal = await User.updateOne(filter, updateUserBalance);
            
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
                alert_nature: 'Withdrawal request submitted! Your account will be credited once approved!',
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
              transac_category:'Withdraw',
              tran_type: 'Debit',
              transac_nature: 'Funds Withdrawal',
              tran_desc: req.body.note,
              createdBy: userFund._id,
              tid: Trans_ID,
              colorcode:'red',
              pay_tran: req.body?.payId, 
              currency_level: '2',
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
              log_desc:'Withdrawal request made',
              log_amt: '',
              log_status: 'Successful',
              log_nature:'Withdrawal request',
              })
            // check if the user activate email notification and send notification
            if(userFund.receive_email_notification == true){
               // send email notification to user
               fetchApp().then((result) =>{
                  appName = result.app_name
                  appLogo = result.app_logo
                  const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                  const mailBody = loginEmail(appName, 'Withdrawal Notification', userFund.display_name, `this is to notify you that your funds withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID}, \n 
                   ${req.body.payId ? 'Transaction Reference ID '+ req.body.payId: 'None. ' } \n Thank you`, logoImage)
                  const TextBody = loginText(userFund.display_name, `this is to notify you that your withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
                   ${req.body.payId? 'Transaction Reference ID ' +req.body.payId: 'None.'}`);
                  let fundAcctMailOptions = {
                  from: { name: `${appName + ' Withdrawal'}`, email: '<noreply@ozaapp.com>' },
                  to: [{ email: userFund.email }],
                  subject: 'Funds Withdrawal Notification!',
                  text: TextBody,
                  html: mailBody,
                 }
                  mailTransporter.send(fundAcctMailOptions).then(console.log)
                  .catch('Email Sending Error ', console.error);

                 // async..await is not allowed in global scope, must use a wrapper
                  }).catch(console.error.bind(console))    
            }   
            // send email notification to admin
            fetchApp().then((result) =>{
              appName = result.app_name
              appLogo = result.app_logo
              const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
              const mailBody = loginEmail(appName, 'Withdrawal Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} has made fund withdrawal request and it has been logged! kindly treat as soon as possible. \n Transaction ID is ${Trans_ID}, \n 
               ${req.body.payId ? 'Transaction Reference ID '+ req.body.payId: 'None. ' } \n Thank you`, logoImage)
              const TextBody = loginText(userFund.display_name, `this is to notify you that withdrawal request has been logged, treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
               ${req.body.payId? 'Transaction Reference ID '+req.body.payId: 'None.'}`);
              let fundAcctMailOptions = {
              from: { name: `${appName + ' Withdrawal'}`, email: '<noreply@ozaapp.com>' },
              to: [{ email: 'hello@ozaapp.com' }],
              subject: 'Funds Withdrawal Notification!',
              text: TextBody,
              html: mailBody,
            }
            mailTransporter.send(fundAcctMailOptions).then(console.log)
            .catch('Email Sending Error ', console.error);

            // async..await is not allowed in global scope, must use a wrapper
           }).catch(console.error.bind(console))        
       // success message
        
        res.status(200).json({msg: '200', feedback: Trans_ID})
        }
    } catch (err) {
       // err message
     console.log(err)
      return res.json({status: 500, message: 'Technical issues occurred' })
   }
});

    // user route to make a withdrawal request goes here...
router.post("/userAccount_withdrawal", isAuth, async (req, res) => {
  const dataReceive = req.body;
  //console.log("Tran ID: ", req.body)
  const Trans_ID = transactionID(25)
  // get the transfer record ID here
  const filter = { _id: dataReceive.userId };
      if (dataReceive.userId == "" || dataReceive.userId == null) {
       return res.status(401).send({ message: "Invalid user access" }); // cot code required
      }

        //console.log("maxi ", fundingLimit[0].app_maxi_funding)
  try {
        //console.log("All App ", fundingLimit)

        let userWithdrawal = await User.findOne({ _id:  dataReceive.userId }); // here I am checking if user exist then I will get user details
        if (!userWithdrawal) {
          //console.log("User details: ", userDetails)
          res.status(404).send({ message: 'User not found' }); // user not found
        } 
        else if (userWithdrawal){
      
            // create record for funding purposes
            const fundAccount = UserWithdrawal.create({
              withdrawal_name: userFund.display_name,
              withdrawal_tid: Trans_ID,
              withdrawal_tag_id: userFund.tag_id,
              amount: dataReceive.amt,
              withdrawal_email: userFund.email,
              withdrawal_note: dataReceive.note,
              });
            // check if user activate in-app notification and send notification
            if(userWithdrawal.receive_app_message == true) {
               const userLogs = Notification.create({
                alert_username: userWithdrawal.display_name,
                alert_name: userWithdrawal.display_name,
                alert_user_ip: '',
                alert_country: '',
                alert_browser: '',
                alert_date: Date.now(),
                alert_user_id: userWithdrawal._id,
                alert_nature: 'Withdrawal request submitted! Your bank account will be credited when approved!',
                alert_status: 1,
                alert_read_date: ''
                })
            }
            // create record for sender history purposes
            const TransfersHistory = TransferFund.create({
              acct_name: userWithdrawal.display_name,
              acct_number: userWithdrawal.tag_id,
              amount: req.body.amt,
              sender_name: userWithdrawal.display_name,
              tran_type: 'Debit',
              transac_nature: 'Withdrawal',
              tran_desc: req.body.note,
              createdBy: userWithdrawal._id,
              currency_level: '2',
              tid: Trans_ID,
              colorcode:'red',
              pay_tran: req.body?.payId,
              sender_acct_number: userWithdrawal.tag_id,
              transaction_status: 'Pending',
              createdOn: Date.now(),
            });

            // create log here
            const addLogs = await SystemActivity.create({
              log_username: userWithdrawal.email,
              log_name: userWithdrawal.display_name,
              log_acct_number: userWithdrawal?.tag_id,
              log_receiver_name: '',
              log_receiver_number: '',
              log_receiver_bank: '',
              log_country: '',
              log_swift_code: '',
              log_desc:'Withdrawal request made',
              log_amt: '',
              log_status: 'Successful',
              log_nature:'Withdrawal request',
              })
            // check if the user activate email notification and send notification
            if(userWithdrawal.receive_email_notification == true){
               // send email notification to user
               fetchApp().then((result) =>{
                  appName = result.app_name
                  appLogo = result.app_logo
                  const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                  const mailBody = loginEmail(appName, 'Withdrawal Notification', userWithdrawal.display_name, `this is to notify you that your withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID}, \n 
                  Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n`, logoImage)
                  const TextBody = loginText(userWithdrawal.display_name, `this is to notify you that your withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
                  Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                  let fundAcctMailOptions = {
                  from: { name: `${appName + ' Team'}`, email: '<noreply@ozaapp.com>' },
                  to: [{ email: userWithdrawal.email }],
                  subject: 'Withdrawal Notification!',
                  text: TextBody,
                  html: mailBody,
                 }
                  mailTransporter.send(fundAcctMailOptions).then(console.log)
                  .catch('Email Sending Error ', console.error);

                 // async..await is not allowed in global scope, must use a wrapper
                  }).catch(console.error.bind(console))    
            }   
            // send email notification to admin
            fetchApp().then((result) =>{
              appName = result.app_name
              appLogo = result.app_logo
              const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
              const mailBody = loginEmail(appName, 'Withdrawal Notification', 'Hello Admin', `this is to notify you that ${userWithdrawal.display_name} has made withdrawal request and it has been logged! kindly treat as soon as possible. \n withdrawal Transaction ID is ${Trans_ID}, \n 
               ${req.body.payId ? 'Transaction Reference ID '+req.body.payId: 'None. ' } \n Thank you`, logoImage)
              const TextBody = loginText(userWithdrawal.display_name, `this is to notify you that withdrawal request has been logged treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
               ${req.body.payId? 'Transaction Reference ID '+ req.body.payId: 'None.'}`);
              let fundAcctMailOptions = {
              from: { name: `${appName + ' Team'}`, email: '<noreply@ozaapp.com>' },
              to: [{ email: 'hello@ozaapp.com' }],
              subject: 'Withdrawal Notification!',
              text: TextBody,
              html: mailBody,
            }
            mailTransporter.send(fundAcctMailOptions).then(console.log)
            .catch('Email Sending Error ', console.error);

            // async..await is not allowed in global scope, must use a wrapper
           }).catch(console.error.bind(console))        
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
  //console.log("Tran ID: ", req.body)
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
                tran_desc:'Request for virtual funds exchange for '+dataReceive.serviceName+" \n "+dataReceive?.sell_note,
                tr_year:'',
                colorcode:'green',
                trans_method: dataReceive.method,
                currency_level:'2',
                createdBy: dataReceive.myId,
                trans_balance: dataReceive.total_money,
                tid: TransID,
                tran_service_type: dataReceive.serviceType,
                pay_tran: dataReceive.method =='Paystack Checkout'? dataReceive.payId : null,
                tran_rate: dataReceive.serviceName == 'PayPal'? getCurrentRate.paypal_buying: dataReceive.serviceName == 'Payoneer'? getCurrentRate.payoneer_buying: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_buying: ''
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
                  alert_nature: 'Request for virtual funds exchange for '+dataReceive.serviceName+ ' was successful, your account with be credited once approved',
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
                    appLogo = result.app_logo
                    const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                    const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \nThank you`, logoImage)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID}`);
                    let fundAcctMailOptions = {
                    from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                    to: [{ email: userFund.email }],
                    subject: 'Account Funding Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                 mailTransporter.send(fundAcctMailOptions).then(console.log)
                  .catch('Email Sending Error ', console.error);

                // async..await is not allowed in global scope, must use a wrapper
                }).catch(console.error.bind(console))
                 
              } 
            // send email notification to admin
            fetchApp().then((result) =>{
              appName = result.app_name
              appLogo = result.app_logo
              const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
              const mailBody = loginEmail(appName, 'Account Funding Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} made fund exchange request and it has been logged, kindly treat as soon as possible. \n Request reference / Transaction ID is ${TransID}, \nThank you`, logoImage)
              const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID}`);
              let fundAcctMailOptions = {
              from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
              to: [{ email: 'hello@ozaapp.com' }],
              subject: 'Account Funding Notification!',
              text: TextBody,
              html: mailBody,
          }
                mailTransporter.send(fundAcctMailOptions).then(console.log)
                  .catch('Email Sending Error ', console.error);

          // async..await is not allowed in global scope, must use a wrapper
          }).catch(console.error.bind(console))
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
                tran_desc:'Request for virtual funds exchange for '+dataReceive.serviceName+" \n "+dataReceive?.buy_note,
                tr_year:'',
                colorcode:'red',
                trans_method: dataReceive.method,
                currency_level:'2',
                createdBy: dataReceive.myId,
                tid: TransID,
                tran_service_type: dataReceive.serviceType,
                trans_balance: dataReceive.total_money,
                pay_tran: dataReceive.method =='Paystack Checkout'? dataReceive.payId : null,
                tran_rate: dataReceive.serviceName == 'PayPal'? getCurrentRate.paypal_selling: dataReceive.serviceName == 'Payoneer'? getCurrentRate.payoneer_selling: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_selling: ''
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
                  alert_nature: 'Request for virtual funds exchange for '+dataReceive.serviceName + ' was successful, your account with be credited once approved',
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
                    appLogo = result.app_logo
                    const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                    const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment is received. \n Request reference / Transaction ID is ${TransID}, \n
                    \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId: ''}
                    \n Thank you`, logoImage)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId:''}`);
                    let fundAcctMailOptions = {
                    from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                    to: [{ email: userFund.email }],
                    subject: 'Account Funding Notification!',
                    text: TextBody,
                    html: mailBody,
                }
                  mailTransporter.send(fundAcctMailOptions).then(console.log)
                   .catch('Email Sending Error ', console.error);
                  
                  }).catch(console.error.bind(console))
               } 
               
            // send email notification to admin
              fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = `<img src=${appLogo} width='100' height='100'/>`;
                const mailBody = loginEmail(appName, 'Account Funding Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} made fund exchange request and it has been logged, kindly treat as soon as possible. \n Request reference / Transaction ID is ${TransID}, \n
                \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId: ''}
                \n Thank you`, logoImage)
                const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId:''}`);
                let fundAcctMailOptions = {
                from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
                to: [{ email: 'hello@ozaapp.com' }],
                subject: 'Account Funding Notification!',
                text: TextBody,
                html: mailBody,
            }
              mailTransporter.send(fundAcctMailOptions).then(console.log)
                .catch('Email Sending Error ', console.error);

            // async..await is not allowed in global scope, must use a wrapper
            }).catch(console.error.bind(console))
            
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
                appLogo = result.app_logo
                const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

                const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \n 
                 Order ID is ${dataReceive.orderId} Thank you`, logoImage)
                 const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n Order ID is ${dataReceive.orderId}`);
                 let acctFundMailOptions = {
                 from: { name: `${appName + ' Support'}`, email: '<noreply@ozaapp.com>' },
                 to: [{ email: userFund.email }],
                 subject: 'Account Funding Notification!',
                 text: TextBody,
                 html: mailBody,
             }
              mailTransporter.send(acctFundMailOptions).then(console.log)
                .catch('Email Sending Error ', console.error);

             // async..await is not allowed in global scope, must use a wrapper
             
                }).catch(console.error.bind(console))
             } 
            // send email notification to admin
             fetchApp().then((result) =>{
              appName = result.app_name
              appLogo = result.app_logo
              const logoImage = `<img src=${appLogo} width='100' height='100'/>`;

              const mailBody = loginEmail(appName, 'Account Funding Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} made fund exchange request and it has been logged, kindly treat as soon as possible. \n Request reference / Transaction ID is ${TransID}, \n 
               Order ID is ${dataReceive.orderId} Thank you`, logoImage)
               const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n Order ID is ${dataReceive.orderId}`);
               let acctFundMailOptions = {
               from: { name: `${appName + ' Sales'}`, email: '<noreply@ozaapp.com>' },
               to: [{ email: 'hello@ozaapp.com' }],
               subject: 'Account Funding Notification!',
               text: TextBody,
               html: mailBody,
           }
            mailTransporter.send(acctFundMailOptions).then(console.log)
            .catch('Email Sending Error ', console.error);
           // async..await is not allowed in global scope, must use a wrapper
           
              }).catch(console.error.bind(console))     
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