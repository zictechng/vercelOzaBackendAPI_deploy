const User = require('../models/User')
const Note = require('../models/Note')
const multer = require("multer");

const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

//@des Get all users
//@route Get /users
//@access Private


const getAllUsers = asyncHandler(async(req, res) =>{
    const users = await User.find().select('-password').lean()
    // ('-password') will remove password from the fetch result
    // .lean() will only get the needed json files doc details
    if(!users?.length){
        return res.status(400).json({message: 'No users found'})
    }
    // else if(users)
    // {
    //     res.json(users)
    // }
    res.json(users)
})

const uploadLocation = "public/images"; // this is the image store location in the project
const storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    callBack(null, uploadLocation);
  },
  filename: (req, file, callBack) => {
    var img_name = Date.now() + "." + file.mimetype.split("/")[1];
    callBack(null, img_name);
  },
});

var upload = multer({ storage: storage });
//@des Create new users
//@route Post /users
//@access Private
const createNewUser = asyncHandler (upload.single("file"), async(req, res) =>{
    // const {username, password, roles} = req.body
    console.log("Data received: ", req.body);

    const {surname, first_name, gender, 
        dob, email, username, password, phone, state, city, currency_type,
        acct_type, country, address, image_photo} = req.body
    
    // confirm data send
    // if(!username || !password || !Array.isArray(roles) || !roles.length ){
    //     return res.status(400).json({message: 'All fields are required'})

    // }

    // if(!username || !password || !surname || !first_name || !gender || !dob || !email || !address ){
    //     return res.status(400).json({msg: '400'}) // all fields are required
    // }
    // Check if user already exist
    const userExist = await User.findOne({username}).lean().exec()
    if(userExist){
        return res.status(409).json({msg: '409'}) // user already exist
    }
    // hash the password here
     //const hashedPwd = await bcrypt.hash(password, 10) // salt rounds
    

     // now we can destruction the variable
     const userObject = { surname, first_name, gender, dob, email, phone, state, city, currency_type,
        acct_type, username, "password": password, country, address, image_photo}

     //now let create/save the user details
        const user = await User.create(userObject)
        if(user){
            res.status(201).json({ msg: '201'}) // success message
        } else{
          res.status(401).json({ msg: '401'})  // invalid user details
        }
    //res.status(201).json({ msg: '201'})
    })

//@des Update users
//@route Patch /users
//@access Private
const updateUser = asyncHandler(async(req, res) =>{
    
    const {id, username, roles, active, password} = req.body

    //confirm data send by user
    if(!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean'){
        return res.status(400).json({ message: ' All filed are required'})
    }

    const user = await User.findById(id).exec()
    if(!user){
        return res.status(400).json({ message: 'User not found'})
    }

    // check for existing username when updating profile details
    const duplicate = await User.findOne({username}).lean().exec()
    // Allow update to the original user
    if(duplicate && duplicate?._id.toString() !== id){
        return res.status(400).json({ message: 'Duplicate username'})
    }
    // now let update the data

    user.username = username
    user.roles = roles
    user.active = active

    // check if the user send password then update
    if(password){
        // hash it before you use it
        user.password = await bcrypt.hash(password, 10) // salt rounds
    }

    // now save the update information
    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated`})



})

//@des Delete users
//@route Delete /users
//@access Private
const deleteUser = asyncHandler(async(req, res) =>{
    
    const {id} = req.body

    if(!id){
        return res.status(400).json({ message: 'User ID is required'})
    }

    const note = await Note.findOne({ user: id}).lean().exec()

    if(note){
        return res.status(400).json({ message: 'User has assigned notes'})
    }

    const user = await User.findById(id).exec()

    if(!user){
        return res.status(400).json({ message: 'User not found'})
    }

    const result = await user.deleteOne()

    const reply = `Username ${result.username} with ID ${result._id} deleted`

    res.json(reply)

})


// export all function
module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}