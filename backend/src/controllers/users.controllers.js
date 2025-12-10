import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import User from "../models/users.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async(req , res) => {
    // get user detail from frontend
        const {fullname , email , username , password} = req.body;
        console.log("Email : " , email);
    // validation -- not empty
        if (
            [fullname , username , email , password]
            .some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400 , "All Fields are required.");
        }
    // check if users already exists username , email   
    const existedUser = await User.findOne({
        $or : [{username} , {email}]
    })
      
    if (existedUser) {
        throw new ApiError(409 , "User already Exists.");
    }
    // check for images  , check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400 , "avatar is required.");
    }
    // upload them into cloudinary , avatar
    const avatar = await uploadCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400 , "avatar is required.");
    }

    // create user object -- create entry in db
    const user = await User.create({
        fullname ,
        username : username.toLowerCase() ,
        email ,
        avatar : avatar.url ,
        password
    })
    // remove password and refresh token field from response
    const createdUser = await User.findById({user._id})
        .select("-password -refreshToken");
    // check for user creation
    if (!createdUser) {
        throw new ApiError(500 , "something went wrong while registering the user.");
    }
    // return res
    return res.status(200).json(
        new ApiResponse(201 , "User Registered SuccessFully.");
    )
})

export {
    registerUser
 }