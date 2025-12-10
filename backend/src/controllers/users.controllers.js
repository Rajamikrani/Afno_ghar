import {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async(req , res) => {
    // get user detail from frontend
    // validation -- not empty
    // check if users already exists username , email
    // check for images  , check for avatar
    // upload them into cloudinary , avatar
    // create user object -- create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
   const {fullname , email} = req.body
   console.log("Email : " , email);
})

export {
    registerUser
 }