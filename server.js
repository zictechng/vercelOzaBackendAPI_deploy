require('dotenv').config()
const paypal = require('paypal-rest-sdk');
const express = require('express')

const registerUser = require("./routes/registerRoutes");
const loginUser = require("./routes/loginRoutes");
const userData = require("./routes/dataRoutes");
const transactionData = require("./routes/transactionRoutes");
const adminUpdateData = require("./routes/updateRoute");

const app = express()
const path = require('path')
// import the logger function
const {logger, logEvents} = require('./middleware/logger')

// import the errorhandler
const errorHandler = require('./middleware/errorHandler')
// 3rd party middleware here
const cookieParser = require('cookie-parser')
const cors = require('cors');
const corsOptions = require('./config/corsOptions') // this will restrict some urls to access our api end point
// if we have a setup server port, it will pick it from the process.env file in the 
// server else use 3500 port

// import the db connection
const connectDB = require('./config/dbConn')
const mongoose = require('mongoose')
const PORT = process.env.PORT || 3500

console.log(process.env.NODE_ENV)

connectDB() // calling the database function

// call the logger function for use here
app.use(logger)

// call the cors here...
app.use(cors()) // for public usage, remove the corsOptions
// for private usage, add the corsOptions into the cors middleware

app.use(express.json()) // this is also built-in middleware

app.use(cookieParser()) // call the cookie-parser for use here
// this will enable use serve image, css and other static files to view/html page
app.use('/', express.static(path.join(__dirname, 'public'))) 
//app.use(express.static ('public')) // this line and above line of code are the same
// express.static is a built-in middleware

app.use("public/images", express.static("images"));

// app route goes here
app.use('/', require('./routes/root'))

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AZIQ8UQS1ZaBQYU8CwV39QC-qTbihvNjyb3hcM6dcOChZn01tBUo4X80cZjmnach3sf41IagLSBOhCPq',
    'client_secret': 'EEe6YAUzp5Q5MQgRsnuHEE28H_6ANbnWphfG0i76QWxcY8eKpZJ73xSWDXFjqqhXBoSSfL2mlvLkYH-H'
  });

  var amt = null;
  
app.use('/api/users', require('./routes/userRoutes'))
app.use("/api", registerUser)
app.use("/api", userData)
app.use("/api", loginUser)
app.use("/api", transactionData)
app.use("/api", adminUpdateData)
//app.use('/notes', require('./routes/noteRoutes'))

router.get('/pay/:amt', (req, res) => {
    amt = req.params.amt
    // const page = req.query.page
    // const method = req.query.method
    // const service_name = req.query.service_name
    // const myId = req.query.myId
    // const pay_note = req.query.pay_note
    // const category = req.query.category
    
    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "https://ozawebservice.onrender.com/success",
            "cancel_url": "https://ozawebservice.onrender.com/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Red Hat",
                    "sku": "001",
                    "price": amt,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": amt
            },
            "description": "Hat for the best team ever"
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            console.error("Paypal Payment Error", error.message);
            //return res.json({status: 400, message: 'Operation Failed, try again'});
            throw error;
             
        } else {
            for(let i = 0;i < payment.links.length;i++){
            if(payment.links[i].rel === 'approval_url'){
                res.redirect(payment.links[i].href);
            }
            }
        }
     });
});

router.get('/success', (req, res) => {
    //const TransID = transactionID(25)
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const payToken = req.query.token;

    console.log("payerId",payerId,"paymentId",paymentId, "Payment token", payToken); 
    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
          "amount": {
              "currency": "USD",
              "total": amt
          }
      }]  
    };
  
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
          console.log("error",error.response);
          throw error;
      } else {

        // process database requests and insert payers information
        // if(userFund){
        //     const method = req.query.method
        //     const service_name = req.query.service_name
        //     const myId = req.query.myId
        //     const pay_note = req.query.pay_note
        //     const category = req.query.category

        //     // create record for funding purposes
        //     const createRecord = TransferFund.create({
        //         acct_name: userFund.display_name,
        //         acct_number: userFund.tag_id,
        //         amount: amt,
        //         bank_name: 'Paypal',
        //         sender_name: userFund.display_name,
        //         sender_acct_number: userFund.tag_id,
        //         sender_currency_type: '$',
        //         tran_type: 'Credit',
        //         transac_nature: req.query.service_name+' '+category,
        //         transac_category: req.query.service_name,
        //         tran_desc:'Request for virtual funds exchange with '+req.query.service_name+" \n "+req.query.pay_note,
        //         tr_year:'',
        //         colorcode:'green',
        //         trans_method: req.query.method,
        //         currency_level:'2',
        //         createdBy: userFund._id,
        //         tid: TransID,
        //         pay_tran: paymentId,
        //         pay_token: payToken,
        //         payer_tran: payerId,
        //         tran_rate: req.query.service_name == 'PayPal'? getCurrentRate.paypal_buying: req.query.service_name == 'Payoneer'? getCurrentRate.payooner_buying: req.query.service_name=='Bitcoin'? getCurrentRate.btc_buying: ''
        //         });
        //     // check if user activate in-app notification and send notification
        //     if(userFund.receive_app_message == true) {
        //         const userLogs = Notification.create({
        //          alert_username: userFund.display_name,
        //          alert_name: userFund.display_name,
        //          alert_user_ip: '',
        //          alert_country: '',
        //          alert_browser: '',
        //          alert_date:  Date.now(),
        //          alert_user_id: userFund._id,
        //          alert_nature: 'Request for virtual funds exchange with '+req.query.service_name,
        //          alert_status: 1,
        //          alert_read_date: ''
        //          })
        //      }
 
        //      // create log here
        //      const addLogs = SystemActivity.create({
        //        log_username: userFund.email,
        //        log_name: userFund.display_name,
        //        log_acct_number: userFund?.tag_id,
        //        log_receiver_name: '',
        //        log_receiver_number: '',
        //        log_receiver_bank: '',
        //        log_country: '',
        //        log_swift_code: '',
        //        log_desc:'Funds exchange request made',
        //        log_amt: '',
        //        log_status: 'Successful',
        //        log_nature:'Fund exchange request',
        //        })
        // }

          res.sendFile(__dirname + "/success.html")
      }
  });
});

router.get('/cancel', (req, res) => res.send('Cancelled'));

// this will handle any request/routes that is not found in the server
// and then send 404 error page to the users
app.all('*', (req, res) =>{
    res.status(404)
    if(req.accepts('html')){
        res.sendFile(path.join(__dirname, 'views', '404.html'))
    } else if(req.accepts('json')){
        res.json({message: '404 Not Found'})
    } else{
        res.type('txt').send('404 Not Found')
    }
})

// call the errorhandler here
app.use(errorHandler)
mongoose.set("strictQuery", false); // this is to suppress some db error
// create the connection here and wrap the app listener into it
mongoose.connection.once('open', () =>{
    console.log('connected to MongoDB')

    app.listen(PORT, () => console.log(`Server is running on port... ${PORT}`))
})

// if there is error in db connection 
mongoose.connection.on('error', err =>{
    // show console message here
    console.log('Error occurred while connecting', err)
    //create error log here
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 
    'mongoErrLog.log')
})