const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const mailTransporter = require('../controllers/emailSender');
const paypal = require('paypal-rest-sdk');
var fetch = require('node-fetch');
const transporterMailer = require('../controllers/signupMailer');
const sendEmail = require("../services/emailService");
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
const { transactEmailText } = require('../emailTemplate/emailRegister');
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
     //console.log('body details', req.body);
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
            name: 'OTA Paypal payment transaction',
            sku: 'OTA-PAYPAL',
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
    //console.log('Paypal Payment Successful ', res)
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
        console.log("success ID ", req.query)
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

const PAYPAL_CLIENT_ID = process.env.PAYPAL_KEY; 
const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET; 

// Function to get PayPal access token from web app
const getPayPalAccessToken = async () => {
  //console.log('PayPal access Key ', PAYPAL_CLIENT_ID +' ', PAYPAL_SECRET_KEY)
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString("base64");
    //const liveEndpoint = await fetch("https://api-m.paypal.com/v1/oauth2/token")
    //const demoEndpoint = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token")  
    const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();

    if (!data.access_token) {
      throw new Error("Failed to get PayPal access token");
    }

    return data.access_token;
  } catch (error) {
    console.error("❌ Error fetching PayPal token:", error);
    throw new Error("PayPal authentication failed");
  }
};

// web app paypal payment capture
  router.post("/capture-payment", isAuth, async (req, res) => {
    const { payerId, orderID, amount } = req.body;
    const authToken = req.headers.authorization?.split(" ")[1];
      paymentData = req.body;
      //console.log("🔍 Received data :", paymentData);

    if (!orderID) {
      return res.status(400).json({ error: "Missing PayPal orderID." });
    }
    try {
      const accessToken = await getPayPalAccessToken();
      //const livePurchases = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`)

      //const livePurchases = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`)

      const captureResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      //console.log("HTTP Status:", captureResponse.status); // 200, 201, etc
      const captureData = await captureResponse.json();
        //console.log("PayPal Capture Response:", captureResponse.json());

        if (captureResponse.status !== 201 && captureResponse.status !== 200) {
          return res.status(500).json({
            error: "Failed to capture PayPal payment",
            details: captureData,});
        }
        // Payment captured successfully
        if (captureData.status !== "COMPLETED") {
          return res.status(500).json({
            error: "Payment not completed by PayPal",
            status: captureStatus,
            details: captureData,
          });
        }

        await processPaymentDetails(paymentData, orderID)
        res.status(201).json({msg: '201', userData: captureData})
          
    } catch (error) {
      console.error("Error capturing payment:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // custom function to create payment details history record here
const processPaymentDetails = async(data, paymentId) =>{
    const TransID = transactionID(25)
       
    const getCurrentRate = await GetRate.findOne();
    try {
        let userFund = await User.findOne({ _id: data.myId }); // here I am checking if user exist then I will get user details
        const isUsdFunding = data.isUsdFunding === true || data.serviceType === 'USD Funding';
        //console.log("User details: ", userFund)
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
              transac_nature: isUsdFunding
                  ? `${data.serviceName} USD Funding`
                  : `${data.serviceName} ${data.serviceCategory || 'Exchange'}`,
                transac_category: data.serviceName,
                tran_desc: isUsdFunding
                  ? `USD wallet funding via ${data.serviceName}. ${data.sell_note || data.note || ''}`
                  : `Request for virtual funds exchange with ${data.serviceName}. ${data.sell_note || ''}`,
              transac_category: data.serviceName,
              tran_desc:'Request for virtual funds exchange with '+data.serviceName+" \n "+data.sell_note,
              tr_year:'',
              colorcode:'green',
              trans_method: data.method,
              currency_level:'2',
              createdBy: data.myId,
              tid: TransID,
              trans_balance: data.total_money,
              tran_service_type: isUsdFunding ? 'USD Funding' : data.serviceType,
              pay_tran: paymentId,
              isUsdFunding: isUsdFunding ?? false,
              tran_rate: data.serviceName === 'PayPal' || data.serviceName === 'Paypal'
                ? getCurrentRate?.paypal_buying
                : data.serviceName === 'Payoneer' || data.serviceName === 'Payooner'
                ? getCurrentRate?.payoneer_buying
                : data.serviceName === 'Bitcoin'
                ? getCurrentRate?.btc_buying
                : '',
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
                alert_nature: isUsdFunding
                  ? `USD Wallet Funding Request via ${data.serviceName}`
                  : `Request for virtual funds exchange with ${data.serviceName}`,
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
              log_desc: isUsdFunding ? 'USD wallet funding request via PayPal' : 'Funds exchange request made',
              log_amt: data.amount,
              log_status: 'Successful',
              log_nature: isUsdFunding ? 'USD Funding Request' : 'Fund exchange request',
              })

            // ── EMAIL TO USER
            if (userFund.receive_email_notification === true) {
              fetchApp().then((result) => {
                const appName = result.app_name;
                const appLogo = result.app_logo;

                const userSubject = isUsdFunding
                  ? 'USD Wallet Funding Request Received'
                  : 'Payment Notification';

                const userMessage = isUsdFunding
                  ? `This is to notify you that your USD wallet funding request of $${data.amount} via ${data.serviceName} has been logged and is pending admin approval.\n\nTransaction ID: ${TransID}\nOrder ID: ${paymentId}\n\nThank you.`
                  : `This is to notify you that your fund exchange request has been logged and we will treat it as soon as your payment is received.\n\nTransaction ID: ${TransID}\nOrder ID: ${paymentId}\n\nThank you.`;

                const mailBody = loginEmail(appName, userSubject, userFund.display_name, userMessage, appLogo);
                const mailText = loginText(userFund.display_name, userMessage);

                sendEmail({
                  from: { name: `${appName} Sales`, email: result.app_email || 'noreply@ozaapp.com' },
                  to: [{ email: userFund.email }],
                  subject: userSubject,
                  text: mailText,
                  html: mailBody,
                }).catch((err) => {
                  console.error('❌ User email failed:', err.message);
                });
              }).catch(console.error);
            }

            // ── EMAIL TO ADMIN 
            fetchApp().then((result) => {
              const appName = result.app_name;
              const appLogo = result.app_logo;

              const adminSubject = isUsdFunding
                ? 'New USD Funding Request'
                : 'New PayPal Fund Exchange Request';

              const adminMessage = isUsdFunding
                ? `${userFund.display_name} has submitted a USD wallet funding request of $${data.amount} via ${data.serviceName}.\n\nTransaction ID: ${TransID}\nOrder ID: ${paymentId}\n\nPlease review and approve.`
                : `${userFund.display_name} has requested a fund exchange.\n\nTransaction ID: ${TransID}\nOrder ID: ${paymentId}\n\nPlease treat as soon as possible.`;

              const mailBody = loginEmail(appName, adminSubject, 'Hello Admin', adminMessage, appLogo);
              const mailText = loginText('Admin', adminMessage);

              sendEmail({
                from: { name: `${appName} Sales`, email: result.app_email || 'noreply@ozaapp.com' },
                to: [{ email: result.app_email || 'noreply@ozaapp.com' }],
                subject: adminSubject,
                text: mailText,
                html: mailBody,
              }).catch((err) => {
                console.error('❌ Admin email failed:', err.message);
              });
            }).catch(console.error);
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
  const Trans_ID = transactionID(25);
  const filter = { _id: dataReceive.userId };

  if (dataReceive.userId == "" || dataReceive.userId == null) {
    return res.status(401).send({ message: "Invalid user access" });
  }

  try {
    let userFund = await User.findOne({ _id: dataReceive.userId });
    let receiverUser = await User.findOne({ tag_id: dataReceive.tagId });

    if (!receiverUser) {
      return res.json({ status: 404, message: 'Receiver record not found' });
    }
    if (!userFund) {
      return res.json({ status: 401, message: 'Invalid access' });
    }

    const filterReceiver = { _id: receiverUser._id };
    const isSelfTransfer = userFund.tag_id === dataReceive.tagId;

    // ✅ FIX 1 — Only block self-transfer for source 1 (bonus→bonus is not allowed)
    // Self transfer source 1 = "move to main" = bonus → main wallet = ALLOWED
    // Self transfer source 2 = USD → USD self credit = NOT ALLOWED
    if (isSelfTransfer && dataReceive.account_source === '2') {
      return res.json({ status: 404, message: 'You cannot send USD funds to your own account' }); // ✅ FIX 4 — message corrected
    }

    // PIN check
    if (userFund.acct_cot_pin !== dataReceive.acctPin) {
      return res.json({ status: 404, message: 'Invalid Pin entered' });
    }

    // ✅ FIX 2 — Balance checks (correct field per source)
   if (dataReceive.account_source === '2') {
  // USD transfer — check sender usd_balance
      if (userFund.usd_balance < dataReceive.amt) {
        return res.json({ status: 404, message: 'Insufficient USD balance' });
      }
      } else if (dataReceive.account_source === '1' && isSelfTransfer) {
        // Move to Main — check bonus balance
        if (userFund.all_bonus_acct < dataReceive.amt) {
          return res.json({ status: 404, message: 'Insufficient bonus balance to move to main wallet' });
        }
      } else if (dataReceive.account_source === '1' && !isSelfTransfer) {
        // Send NGN to another user — check main wallet (amount)
        if (userFund.amount < dataReceive.amt) {
          return res.json({ status: 404, message: 'Insufficient main wallet balance' });
        }
    }

    // Sender balance update
    let senderBalance;
    let senderBalance_usd;
    let currentReceiverBal;

    if (isSelfTransfer) {
    // Move to Main: bonus → main (same user, handled atomically below)
    senderBalance = userFund.all_bonus_acct - +dataReceive.amt;
    currentReceiverBal = userFund.amount + +dataReceive.amt;

    } else if (dataReceive.account_source === '1') {
      // NGN to another user: deduct sender main wallet, credit receiver main wallet
      senderBalance = userFund.amount - +dataReceive.amt;
      currentReceiverBal = receiverUser.amount + +dataReceive.amt;

    } else if (dataReceive.account_source === '2') {
      // USD to another user: deduct sender usd_balance, credit receiver usd_balance
      senderBalance_usd = userFund.usd_balance - +dataReceive.amt;
      currentReceiverBal = receiverUser.usd_balance + +dataReceive.amt;
    }

    // ── Apply DB Updates
      if (isSelfTransfer) {
        // Atomic single update — deduct bonus, credit main wallet
        await User.updateOne(filter, {
          $set: {
            all_bonus_acct: senderBalance,
            amount: currentReceiverBal,
            acct_balance: currentReceiverBal,
            last_transaction: dataReceive.amt,
          },
        });

      } else if (dataReceive.account_source === '1') {
        // Deduct sender main wallet
        await User.updateOne(filter, {
          $set: {
            amount: senderBalance,
            acct_balance: senderBalance,
            last_transaction: dataReceive.amt,
          },
        });
        // Credit receiver main wallet
        await User.updateOne(filterReceiver, {
          $set: {
            amount: currentReceiverBal,
            acct_balance: currentReceiverBal,
            last_transaction: dataReceive.amt,
          },
        });

      } else if (dataReceive.account_source === '2') {
        // Deduct sender USD
        await User.updateOne(filter, {
          $set: {
            usd_balance: senderBalance_usd,
            last_transaction: dataReceive.amt,
          },
        });
        // Credit receiver USD
        await User.updateOne(filterReceiver, {
          $set: {
            usd_balance: currentReceiverBal,
            last_transaction: dataReceive.amt,
          },
        });
      }
    // Receiver balance update
    let updateReceiverBalance;

    if (dataReceive.account_source === '1' && isSelfTransfer) {
      // ✅ FIX 1 — "Move to main": deduct bonus, credit main wallet (amount) on same user
      currentReceiverBal = receiverUser.amount + +dataReceive.amt;
      updateReceiverBalance = {
        $set: {
          amount: currentReceiverBal,
          acct_balance: currentReceiverBal,
          last_transaction: dataReceive.amt,
        },
      };
    } else if (dataReceive.account_source === '1') {
      // source 1 to another user — credit their main amount
      currentReceiverBal = receiverUser.amount + +dataReceive.amt;
      updateReceiverBalance = {
        $set: {
          amount: currentReceiverBal,
          acct_balance: currentReceiverBal,
          last_transaction: dataReceive.amt,
        },
      };
    } else if (dataReceive.account_source === '2') {
      // USD to another user — credit their usd_balance
      currentReceiverBal = receiverUser.usd_balance + +dataReceive.amt;
      updateReceiverBalance = {
        $set: {
          usd_balance: currentReceiverBal,
          last_transaction: dataReceive.amt,
        },
      };
    }
    const isCurrency2 = dataReceive.account_source === '2';
    const formatAmt = (amt) => isCurrency2
      ? `$${new Intl.NumberFormat().format(amt)}`
      : `₦${new Intl.NumberFormat().format(amt)}`;

    // Receiver history
    await TransferFund.create({
      acct_name: receiverUser.display_name,
      acct_number: receiverUser.tag_id,
      amount: dataReceive.amt,
      sender_name: userFund.display_name,
      sender_currency_type: isCurrency2 ? '$': '₦',
      tran_type: 'Credit',
      transac_nature: 'In-app Credit',
      transac_category:'Account Funding',
      tran_desc: dataReceive.note,
      trans_balance: currentReceiverBal,
      createdBy: receiverUser._id,
      tid: Trans_ID,
      colorcode: 'green',
      currency_level: isCurrency2 ? '2' : '1',
      sender_acct_number: userFund.tag_id,
      transaction_status: 'Successful',
      createdOn: Date.now(),
    });

    // Sender history — ✅ FIX 3: use correct balance variable per source
    await TransferFund.create({
      acct_name: userFund.display_name,
      acct_number: userFund.tag_id,
      amount: dataReceive.amt,
      sender_name: userFund.display_name,
      sender_currency_type: isCurrency2 ? '$': '₦',
      tran_type: 'Debit',
      transac_nature: 'In-app Debit',
      transac_category:'Fund Transfer',
      tran_desc: dataReceive.note,
      trans_balance: isCurrency2 ? senderBalance_usd : senderBalance, // ✅ FIX 3
      createdBy: userFund._id,
      tid: Trans_ID,
      colorcode: 'red',
      currency_level: isCurrency2 ? '2' : '1',
      sender_acct_number: userFund.tag_id,
      transaction_status: 'Successful',
      createdOn: Date.now(),
    });

    // In-app notification — sender
    if (userFund.receive_app_message === true) {
      await Notification.create({
        alert_username: userFund.display_name,
        alert_name: userFund.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date: Date.now(),
        alert_user_id: userFund._id,
        alert_nature: `Your transfer of ${formatAmt(dataReceive.amt)}.\nTransaction ID: ${Trans_ID}\nTo ${receiverUser.display_name} was successful.`,
        alert_status: 1,
        alert_read_date: '',
      });
    }

    // In-app notification — receiver (skip if self transfer to avoid duplicate)
    if (receiverUser.receive_app_message === true && !isSelfTransfer) {
      await Notification.create({
        alert_username: receiverUser.display_name,
        alert_name: receiverUser.display_name,
        alert_user_ip: '',
        alert_country: '',
        alert_browser: '',
        alert_date: Date.now(),
        alert_user_id: receiverUser._id,
        alert_nature: `Your account was credited with ${formatAmt(dataReceive.amt)}.\nTransaction ID: ${Trans_ID}\nFrom ${userFund.display_name}.`,
        alert_status: 1,
        alert_read_date: '',
      });
    }

    await SystemActivity.create({
      log_username: userFund.email,
      log_name: userFund.display_name,
      log_acct_number: userFund?.tag_id,
      log_receiver_name: receiverUser.display_name,
      log_receiver_number: receiverUser.tag_id,
      log_receiver_bank: '',
      log_country: '',
      log_swift_code: '',
      log_desc: 'Funds transfer request made',
      log_amt: dataReceive.amt,
      log_status: 'Successful',
      log_nature: 'Transfer request',
    });

    // ✅ Email always sent to both sender and receiver in ALL cases
    const sendEmailNotification = async (user, subject, heading, bodyMsg) => {
      if (user.receive_email_notification !== true) return;
      try {
        const result = await fetchApp();
        const mailBody = loginEmail(result.app_name, heading, user.display_name, bodyMsg, result.app_logo);
        const textBody = loginText(user.display_name, bodyMsg.replace(/<[^>]+>/g, ''));
        await sendEmail({
          from: { name: `${result.app_name} Payments`, email: `<${result.app_email || 'noreply@ota.com'}>` },
          to: [{ email: user.email }],
          subject,
          text: textBody,
          html: mailBody,
        });
      } catch (err) {
        console.error("❌ Email sending failed:", err.message);
      }
    };

    // Sender debit email
    await sendEmailNotification(
      userFund,
      'Account Debit Notification!',
      'Account Debit Notification',
      `Your transfer of <b>${formatAmt(dataReceive.amt)}</b> to ${receiverUser.display_name} was successful. Transaction ID: ${Trans_ID}`
    );

    // Receiver credit email — always send, even on self transfer (move to main)
    await sendEmailNotification(
      receiverUser,
      'Account Credit Notification!',
      'Account Credit Notification',
      `Your account was credited with <b>${formatAmt(dataReceive.amt)}</b> from a wallet transfer. Transaction ID: ${Trans_ID}`
    );

    const newUserDetail = await User.findOne({ _id: dataReceive.userId });
    res.status(201).json({ msg: '200', userData: newUserDetail });

  } catch (err) {
    console.log(err);
    return res.json({ status: 500, message: 'Technical issues occurred' });
  }
});


// POST /api/verify_paystack_payment
// Verifies PayStack payment and instantly credits user wallet
router.post("/verify_paystack_payment", isAuth, async (req, res) => {
  const { reference, userId, amt } = req.body;

  if (!reference || !userId) {
    return res.json({ status: 400, message: 'Reference and userId are required' });
  }

  try {
    // Step 1 — Verify payment with PayStack API
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return res.json({
        status: 400,
        message: 'Payment verification failed. Please contact support.',
      });
    }

    // Step 2 — Get verified amount from PayStack (in kobo — divide by 100)
    const verifiedAmount = paystackData.data.amount / 100;

    // Step 3 — Find user
    const userFund = await User.findOne({ _id: userId });
    if (!userFund) {
      return res.status(404).json({ message: 'User not found' });
    }

    const Trans_ID = transactionID(25);

    // Step 4 — Credit wallet instantly
    const creditWallet = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { amount: verifiedAmount } },
      { new: true }
    );

    // Step 5 — Create completed transaction record
    await TransferFund.create({
      acct_name: userFund.display_name,
      acct_number: userFund.tag_id,
      amount: verifiedAmount,
      sender_name: userFund.display_name,
      transac_category: 'Account Funding',
      tran_type: 'Credit',
      transac_nature: 'In-app funding',
      createdBy: userFund._id,
      tid: Trans_ID,
      colorcode: 'green',
      pay_tran: reference,
      sender_acct_number: userFund.tag_id,
      transaction_status: 'Completed',
      creditOn: Date.now(),
      createdOn: Date.now(),
    });

    // Step 6 — Create funding record
    await FundUserAccount.create({
      fund_name: userFund.display_name,
      fund_number: Trans_ID,
      fund_tag_id: userFund.tag_id,
      amount: verifiedAmount,
      fund_email: userFund.email,
      fund_method: 'PayStack',
      fund_status: 'Approved',
    });

    // Step 7 — Send notification
    if (userFund.receive_app_message === true) {
      await Notification.create({
        alert_username: userFund.display_name,
        alert_name: userFund.display_name,
        alert_user_id: userFund._id,
        alert_date: Date.now(),
        alert_nature: `Your account has been funded with ₦${new Intl.NumberFormat().format(verifiedAmount)} via PayStack. Transaction ID: ${Trans_ID}`,
        alert_status: 1,
        alert_read_date: '',
      });
    }

    // Step 8 — Process bonus and referral
    
    // Step 9 — Send email notification
    if (userFund.receive_email_notification === true) {
      fetchApp().then((result) => {
        const appName = result.app_name;
        const appLogo = result.app_logo;
        const logoImage = appLogo;
        const mailBody = loginEmail(
          appName,
          'Account Funding Successful',
          userFund.display_name,
          `Your account has been credited with ₦${new Intl.NumberFormat().format(verifiedAmount)} via PayStack. Transaction ID: ${Trans_ID}`,
          logoImage
        );
        const fundMailOptions = {
          from: { name: `${appName} Payments`, email: `<${result.app_email || 'noreply@ota.com'}>` },
          to: [{ email: userFund.email }],
          subject: 'Account Funded Successfully!',
          html: mailBody,
        };
        sendEmail(fundMailOptions).catch(err => {
          console.error('Email error:', err.message);
        });
      }).catch(console.error.bind(console));
    }

    const { password, ...userDetails } = creditWallet._doc;

    return res.status(200).json({
      msg: '201',
      message: 'Payment verified and wallet credited successfully',
      feedback: Trans_ID,
      userData: userDetails,
    });

  } catch (err) {
    console.error('PayStack verification error:', err.message);
    return res.status(500).json({ status: 500, message: 'Server error: ' + err.message });
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
              return res.json({status: 403, message: `Maximum amount funding should is \u20A6${new Intl.NumberFormat().format(fundingLimit[0].app_maxi_funding)}` })
            }
            if(dataReceive.amt < fundingLimit[0].app_minim_funding ){
              return res.json({status: 403, message: `Minimum funding amount is \u20A6${new Intl.NumberFormat().format(fundingLimit[0].app_minim_funding)} accepted` })
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
                  fund_method: dataReceive.method,
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
                      const logoImage = appLogo;
                      const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as we confirm your payment status. \n Account funding Transaction ID is ${Trans_ID}, \n 
                      Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n Thank you`, logoImage)
                      const TextBody = loginText(userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as your payment received. \n Transaction ID is ${Trans_ID} \n
                      Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                      let fundAcctMailOptions = {
                      from: { name: `${appName + ' Sales'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                      to: [{ email: userFund.email }],
                      subject: 'Account Funding Notification!',
                      text: TextBody,
                      html: mailBody,
                    }
                      sendEmail(fundAcctMailOptions).catch((err) => {
                        console.error("❌ Email sending completely failed:", err.message);
                      });

                    // async..await is not allowed in global scope, must use a wrapper
                      }).catch(console.error.bind(console))    
                }   
                // send email notification to admin
                fetchApp().then((result) =>{
                  appName = result.app_name
                  appLogo = result.app_logo
                  const logoImage = appLogo;
                  const mailBody = loginEmail(appName, 'Account Funding Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} has made account funding request and it has been logged! kindly treat as soon as possible. \n Account funding Transaction ID is ${Trans_ID}, \n 
                  Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n Thank you`, logoImage)
                  const TextBody = loginText(userFund.display_name, `this is to notify you that your account funding request has been logged and we will treat as soon as your payment received. \n Transaction ID is ${Trans_ID} \n
                  Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                  let fundAcctMailOptions = {
                  from: { name: `${appName + ' Sales'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                  to: [{ email: `<${result.app_email || 'noreply@ota.com'}>` }],
                  subject: 'Account Funding Notification!',
                  text: TextBody,
                  html: mailBody,
                }
                sendEmail(fundAcctMailOptions).catch((err) => {
                  console.error("❌ Email sending completely failed:", err.message);
                });
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
            return res.json({status: 403, message: `Minimum withdrawal amount of \₦${new Intl.NumberFormat().format(fundingLimit[0].app_mini_withdrawal)} accepted` })
          }
          if(dataReceive.amt > fundingLimit[0]?.app_maxi_withdrawal ){
            return res.json({status: 403, message: `Withdrawal amount should not exceed \₦${new Intl.NumberFormat().format(fundingLimit[0].app_maxi_withdrawal)}` })
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
              const currentUserFund = await User.findOne({ _id:  dataReceive.userId });
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
                pay_tran: req.body?.payId ? req.body?.payId:'', 
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
                    const logoImage = appLogo;
                    const mailBody = loginEmail(appName, 'Withdrawal Notification', userFund.display_name, `this is to notify you that your funds withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID}, \n 
                    ${req.body.payId ? 'Transaction Reference ID '+ req.body.payId: 'None. ' } \n Thank you`, logoImage)
                    const TextBody = loginText(userFund.display_name, `this is to notify you that your withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
                    ${req.body.payId? 'Transaction Reference ID ' +req.body.payId: 'None.'}`);
                    let fundAcctMailOptions = {
                    from: { name: `${appName + ' Withdrawal'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                    to: [{ email: userFund.email }],
                    subject: 'Funds Withdrawal Notification!',
                    text: TextBody,
                    html: mailBody,
                  }
                    sendEmail(fundAcctMailOptions).catch((err) => {
                      console.error("❌ Email sending completely failed:", err.message);
                    });
                
                }).catch(console.error.bind(console))    
              }   
              // send email notification to admin
              fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = appLogo;
                const mailBody = loginEmail(appName, 'Withdrawal Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} has made fund withdrawal request and it has been logged! kindly treat as soon as possible. \n Transaction ID is ${Trans_ID}, \n 
                ${req.body.payId ? 'Transaction Reference ID '+ req.body.payId: 'None. ' } \n Thank you`, logoImage)
                const TextBody = loginText(userFund.display_name, `this is to notify you that withdrawal request has been logged, treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
                ${req.body.payId? 'Transaction Reference ID '+req.body.payId: 'None.'}`);
                let acct_withdrawalMail = {
                from: { name: `${appName + ' Withdrawal'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                to: [{ email: `<${result.app_email || 'noreply@ota.com'}>` }],
                subject: 'Funds Withdrawal Notification!',
                text: TextBody,
                html: mailBody,
              }
              sendEmail(acct_withdrawalMail).catch((err) => {
                console.error("❌ Email sending completely failed:", err.message);
              });
            }).catch(console.error.bind(console))        
        // success message
        const { password, password_plain, ...others } = currentUserFund._doc;
          res.status(200).json({msg: '200', feedback: Trans_ID, userData: others})
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
          let userWithdrawal = await User.findOne({ _id:  dataReceive.userId });
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
                    const logoImage = appLogo;
                    const mailBody = loginEmail(appName, 'Withdrawal Notification', userWithdrawal.display_name, `this is to notify you that your withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID}, \n 
                    Transaction Reference ID ${req.body.payId ? req.body.payId: 'None. ' } \n`, logoImage)
                    const TextBody = loginText(userWithdrawal.display_name, `this is to notify you that your withdrawal request has been logged and we will treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
                    Transaction Reference ID ${req.body.payId? req.body.payId: 'None.'}`);
                    let acct_withdrawal = {
                    from: { name: `${appName + ' Team'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                    to: [{ email: userWithdrawal.email }],
                    subject: 'Withdrawal Notification!',
                    text: TextBody,
                    html: mailBody,
                  }

                    sendEmail(acct_withdrawal).catch((err) => {
                      console.error("❌ Email sending completely failed:", err.message);
                    });

                  // async..await is not allowed in global scope, must use a wrapper
                    }).catch(console.error.bind(console))    
              }   
              // send email notification to admin
              fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = appLogo;
                const mailBody = loginEmail(appName, 'Withdrawal Notification', 'Hello Admin', `this is to notify you that ${userWithdrawal.display_name} has made withdrawal request and it has been logged! kindly treat as soon as possible. \n withdrawal Transaction ID is ${Trans_ID}, \n 
                ${req.body.payId ? 'Transaction Reference ID '+req.body.payId: 'None. ' } \n Thank you`, logoImage)
                const TextBody = loginText(userWithdrawal.display_name, `this is to notify you that withdrawal request has been logged treat as soon as possible. \n Transaction ID is ${Trans_ID} \n
                ${req.body.payId? 'Transaction Reference ID '+ req.body.payId: 'None.'}`);
                let fundAcctMailOptionAdmin = {
                from: { name: `${appName + ' Team'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                to: [{ email: `<${result.app_email || 'noreply@ota.com'}>` }],
                subject: 'Withdrawal Notification!',
                text: TextBody,
                html: mailBody,
              }
              sendEmail(fundAcctMailOptionAdmin).catch((err) => {
                console.error("❌ Email sending completely failed:", err.message);
              });
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
                  tran_rate: dataReceive.serviceName == 'PayPal' || dataReceive.serviceName =='Paypal'? getCurrentRate.paypal_buying: dataReceive.serviceName == 'Payoneer' || dataReceive.serviceName =='Payooner'? getCurrentRate.payoneer_buying: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_buying: ''
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
                      const logoImage = appLogo;
                      const mailBody = loginEmail(appName, 'Account Funding Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment received. \n Request reference / Transaction ID is ${TransID}, \nThank you`, logoImage)
                      const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID}`);
                      let fundAcctMailOptionUser = {
                      from: { name: `${appName + ' Sales'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                      to: [{ email: userFund.email }],
                      subject: 'Account Funding Notification!',
                      text: TextBody,
                      html: mailBody,
                  }
                    sendEmail(fundAcctMailOptionUser).catch((err) => {
                      console.error("❌ Email sending completely failed:", err.message);
                    });
                  // async..await is not allowed in global scope, must use a wrapper
                  }).catch(console.error.bind(console))
                  
                } 
              // send email notification to admin
              fetchApp().then((result) =>{
                appName = result.app_name
                appLogo = result.app_logo
                const logoImage = appLogo;
                const mailBody = loginEmail(appName, 'Account Funding Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} made fund exchange request and it has been logged, kindly treat as soon as possible. \n Request reference / Transaction ID is ${TransID}, \nThank you`, logoImage)
                const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID}`);
                let fundAcctMailOptionsAdmin = {
                from: { name: `${appName + ' Sales'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                to: [{ email: `<${result.app_email || 'noreply@ota.com'}>` }],
                subject: 'Account Funding Notification!',
                text: TextBody,
                html: mailBody,
            }
              sendEmail(fundAcctMailOptionsAdmin).catch((err) => {
                console.error("❌ Email sending completely failed:", err.message);
              });
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


// POST /api/usd_account_funding
// User submits USD funding request via PayPal/Payoneer/BTC
// Same flow as selling — admin approves → usd_balance credited
router.post("/usd_account_funding", isAuth, async (req, res) => {
  const dataReceive = req.body;
  const Trans_ID = transactionID(25);
  if (!dataReceive.userId) {
    return res.status(401).json({ message: 'Invalid user access' });
  }
  try {
    const userFund = await User.findOne({ _id: dataReceive.userId });
    if (!userFund) return res.status(404).json({ message: 'User not found' });

    const getCurrentRate = await GetRate.findOne();

    // Create pending TransferFund record
    await TransferFund.create({
      acct_name: userFund.display_name,
      acct_number: userFund.tag_id,
      amount: dataReceive.amt,
      sender_name: userFund.display_name,
      sender_acct_number: userFund.tag_id,
      sender_currency_type: '$',
      tran_type: 'Credit',
      transac_nature: `${dataReceive.serviceName} USD Funding`,
      transac_category: dataReceive.serviceName,
      tran_desc: `USD wallet funding via ${dataReceive.serviceName}. ${dataReceive.note || ''}`,
      colorcode: 'green',
      trans_method: dataReceive.method || 'Manual',
      currency_level: '2',
      createdBy: dataReceive.userId,
      tid: Trans_ID,
      tran_service_type: 'USD Funding',
      tran_rate: dataReceive.serviceName === 'PayPal' ? getCurrentRate?.paypal_buying
        : dataReceive.serviceName === 'Payoneer' ? getCurrentRate?.payoneer_buying
        : dataReceive.serviceName === 'Bitcoin' ? getCurrentRate?.btc_buying : 1,
      transaction_status: 'Pending',
      createdOn: Date.now()
    });

    // In-app notification
    if (userFund.receive_app_message) {
      await Notification.create({
        alert_username: userFund.display_name,
        alert_name: userFund.display_name,
        alert_date: new Date(),
        alert_user_id: userFund._id,
        alert_nature: `USD Wallet Funding Request\nYour ${dataReceive.serviceName} funding of $${dataReceive.amt} has been submitted and is pending admin approval. TID: ${Trans_ID}`,
        alert_status: 1,
        alert_read_date: '',
      });
    }

    return res.json({ msg: '200', message: 'USD funding request submitted successfully', tid: Trans_ID });
  } catch (err) {
    console.log('USD funding error:', err.message);
    return res.status(500).json({ msg: '500', message: err.message });
  }
});

// POST /api/usd_account_withdrawal
// User requests withdrawal from usd_balance
router.post("/usd_account_withdrawal", isAuth, async (req, res) => {
  const { userId, amt, serviceName, walletAddress, note } = req.body;
  if (!userId) return res.status(401).json({ message: 'Invalid user access' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const usdBalance = Number(user.usd_balance || 0);
    const amount = Number(amt);

    if (amount <= 0) return res.json({ msg: '400', message: 'Invalid amount' });
    if (amount > usdBalance) return res.json({ msg: '403', message: 'Insufficient USD balance' });

    const Trans_ID = transactionID(25);

    // Deduct from usd_balance immediately (hold pending withdrawal)
    await User.findByIdAndUpdate(userId, {
      usd_balance: usdBalance - amount,
    });

    // Create withdrawal record
    await TransferFund.create({
      acct_name: user.display_name,
      acct_number: user.tag_id,
      amount,
      sender_currency_type: '$',
      tran_type: 'Debit',
      transac_nature: `${serviceName} USD Withdrawal`,
      transac_category: serviceName,
      tran_desc: `USD withdrawal via ${serviceName}. Wallet: ${walletAddress}. ${note || ''}`,
      colorcode: 'red',
      trans_method: 'Manual',
      currency_level: '2',
      createdBy: userId,
      tid: Trans_ID,
      tran_service_type: 'USD Withdrawal',
      transaction_status: 'Pending',
    });

    return res.json({ msg: '200', message: 'USD withdrawal request submitted', tid: Trans_ID });
  } catch (err) {
    console.log('USD withdrawal error:', err.message);
    return res.status(500).json({ msg: '500', message: err.message });
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
                  tran_desc:'Request for virtual funds exchange for '+dataReceive.serviceName+" \n "+dataReceive.buy_note? dataReceive.buy_note:'',
                  tr_year:'',
                  colorcode:'red',
                  trans_method: dataReceive.method,
                  currency_level:'2',
                  createdBy: dataReceive.myId,
                  tid: TransID,
                  tran_service_type: dataReceive.serviceType,
                  trans_balance: dataReceive.total_money,
                  pay_tran: dataReceive.method =='Paystack Checkout'? dataReceive.payId : null,
                  tran_rate: dataReceive.serviceName == 'PayPal' || dataReceive.serviceName =='Paypal'? getCurrentRate.paypal_selling: dataReceive.serviceName == 'Payoneer' || dataReceive.serviceName =='Payooner'? getCurrentRate.payoneer_selling: dataReceive.serviceName=='Bitcoin'? getCurrentRate.btc_selling: ''
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
                      const logoImage = appLogo;
                      const mailBody = loginEmail(appName, 'Transaction Notification', userFund.display_name, `this is to notify you that your fund exchange request has been logged and we will treat as soon as your payment is received. \n Request reference / Transaction ID is ${TransID}, \n
                      \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId: ''}
                      \n Thank you`, logoImage)
                      const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId:''}`);
                      let fundAcctMailUserBuy = {
                      from: { name: `${appName + ' Sales'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                      to: [{ email: userFund.email }],
                      subject: 'Transaction Notification!',
                      text: TextBody,
                      html: mailBody,
                  }
                    sendEmail(fundAcctMailUserBuy).catch((err) => {
                      console.error("❌ Email sending completely failed:", err.message);
                    });
                    
                    }).catch(console.error.bind(console))
                } 
                
              // send email notification to admin
                fetchApp().then((result) =>{
                  appName = result.app_name
                  appLogo = result.app_logo
                  const logoImage = appLogo;
                  const mailBody = loginEmail(appName, 'Transaction Notification', 'Hello Admin', `this is to notify you that ${userFund.display_name} made fund exchange request and it has been logged, kindly treat as soon as possible. \n Request reference / Transaction ID is ${TransID}, \n
                  \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId: ''}
                  \n Thank you`, logoImage)
                  const TextBody = loginText(userFund.display_name, `this is to notify you that your request has been logged and will treat as soon as your payment received. \n Transaction ID is ${TransID} \n ${ 'Transaction reference', dataReceive.method == 'Paystack Checkout'? dataReceive.payId:''}`);
                  let fundAcctMailBuyAdmin = {
                  from: { name: `${appName + ' Sales'}`, email: `<${result.app_email || 'noreply@ota.com'}>` },
                  to: [{ email: `<${result.app_email || 'noreply@ota.com'}>` }],
                  subject: 'Transaction Notification!',
                  text: TextBody,
                  html: mailBody,
              }
              sendEmail(fundAcctMailBuyAdmin).catch((err) => {
                console.error("❌ Email sending completely failed:", err.message);
              });
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

  router.get("/user_wallet_profile/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const userDetails = await User.findOne({ _id: userId });
    if (!userDetails) {
      return res.status(404).json({ msg: '404', message: 'No record found' });
    }

    const { password, ...others } = userDetails._doc;

    return res.status(200).json({
      msg: '200',
      userData: others,
    });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ msg: '500', message: err.message });
  }
});

module.exports = router;