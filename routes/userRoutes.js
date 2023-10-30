const express = require('express')
const router = express.Router()
const usersController = require('../controllers/usersController')

router.route('/')
.get(usersController.getAllUsers)
.post(usersController.createNewUser)
.patch(usersController.updateUser)
.delete(usersController.deleteUser)


// export the module
module.exports = router