const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

const User = require('../models/User');
const TransferFund = require('../models/fundTransfer');
const Officer = require('../models/accountOfficer');
const Ticket = require('../models/ticketData');
const Investment = require('../models/investPlan');




// fetch user details to show in the edit form here..
router.get("/fetch_edit_user/:id", async (req, res) => {
    let myId = req.params.id;
    
    console.log("Update Route Data", req.params.id);
    // Getting full month name (e.g. "June")
    var today = new Date();
    var month = today.toLocaleString('default', { month: 'long' });
    
    //console.log("today Month", month);
    try {
      const userData = await User.find({_id: myId });
  
      // const chartStatement = await TransferFund. aggregate([
      //   { $match: { createdBy: myId } },
      //   { $group: { tr_year: "$tr_year" } },
      // ]);
  
     
      console.log("Chart Details ", userData)
      res.status(200).send(userData);
    } catch (err) {
      res.status(500).json(err);
      console.log(err.message);
    }
  });






  // export the module
module.exports = router