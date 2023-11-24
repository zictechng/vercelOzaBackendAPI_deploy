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

// paypal.configure({
//     'mode': 'sandbox', //sandbox or live
//     'client_id': 'AZIQ8UQS1ZaBQYU8CwV39QC-qTbihvNjyb3hcM6dcOChZn01tBUo4X80cZjmnach3sf41IagLSBOhCPq',
//     'client_secret': 'EEe6YAUzp5Q5MQgRsnuHEE28H_6ANbnWphfG0i76QWxcY8eKpZJ73xSWDXFjqqhXBoSSfL2mlvLkYH-H'
//   });

//   var amt = null;
  
app.use('/api/users', require('./routes/userRoutes'))
app.use("/api", registerUser)
app.use("/api", userData)
app.use("/api", loginUser)
app.use("/api", transactionData)
app.use("/api", adminUpdateData)
//app.use('/notes', require('./routes/noteRoutes'))

paypal.configure({
    'mode': 'sandbox',
    'client_id': 'AZIQ8UQS1ZaBQYU8CwV39QC-qTbihvNjyb3hcM6dcOChZn01tBUo4X80cZjmnach3sf41IagLSBOhCPq',
    'client_secret': 'EEe6YAUzp5Q5MQgRsnuHEE28H_6ANbnWphfG0i76QWxcY8eKpZJ73xSWDXFjqqhXBoSSfL2mlvLkYH-H'
  });
  
  app.post('/create-payment', (req, res) => {
    const { amount, currency } = req.body;
  
    const createPaymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal',
      },
      redirect_urls: {
        return_url: "https://ozawebservice.onrender.com/success",
        cancel_url: "https://ozawebservice.onrender.com/cancel",
      },
      transactions: [{
        item_list: {
          items: [{
            name: 'Product Name',
            sku: '001',
            price: amount,
            currency,
            quantity: 1,
          }],
        },
        amount: {
          currency: "USD",
          total: amount,
        },
        description: 'Description of the product',
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
  
  app.get('/success', (req, res) => {
    // Handle successful payment execution here
    res.send('Payment successful!');
  });
  
  app.get('/cancel', (req, res) => {
    // Handle canceled payment here
    res.send('Payment canceled.');
  });

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