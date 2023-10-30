const express = require('express')
const router = express.Router()
const path = require('path')


// this is for nodejs frontend view request
router.get('^/$|/index(.html)?', (req, res) =>{
    //res.sendFile(path.join(__dirname, '..', 'views', 'index.html'))
    res.json({success: true, message: 'Rugipo Mobile API System'})

})

module.exports = router;