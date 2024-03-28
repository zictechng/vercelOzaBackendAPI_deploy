const express = require('express')
const router = express.Router()

const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');

//const transporter = require('../controllers/mailSender');
const { isAuth } = require('../middleware/auth');
const moment = require('moment');
const { transactEmail, transactEmailText } = require('../emailTemplate/emailRegister');
const { loginEmail, loginText } = require('../emailTemplate/emailLogin');
const { fetchApp } = require('../middleware/appDetails');

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

    // get user wallet account balance here..
router.get("/allDaily_salesTest", isAuth, async (req, res) => {
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
    // const userWallet = await TransferFund.aggregate(
    //   [{$match: {fund_tag_id: userId, fund_status: 'Approved'}, },
    //   {$group: {_id: null, totalAmount: { $sum: '$amount' }}}]
    //   );

      // annually chart total report
      let dailySales = 0;
      const todaySales = await TransferFund.find(
        // {
        //   transaction_status: 'Successful',
        //   creditOn: {$gte: todayTime}, 
        //   // "creditOn": {
        //   //   $gte{ $date : {{ moment().startOf('day') }} }
        //   // }
        // });
        {
          fund_tag_id: userDetails.tag_id, fund_status: 'Approved',
          creditOn: {$gte: startYear, $lt: endYear}, 
        });
        dailySales = todaySales.reduce((sum, transaction) => sum + transaction.amount, 0);
      
        console.log("Today Sale ", dailySales)
      res.send({ msg: '201', feedback: userWallet})
    } catch (err) {
    res.status(500).json(err.message);
    console.log(err.message);
  }
});


module.exports = router;