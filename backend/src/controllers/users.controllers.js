import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import User from "../models/users.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadCloudinary , deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// Initialize the options
const options = {
    httpOnly : true ,
    secure : true
}
// controller for register user
const registerUser = asyncHandler(async(req , res) => {
    // get user detail from frontend
        const {fullname , email , username , password , role , bio , address} = req.body;
        const {country , state , city} = address || {};
        console.log("Email : " , email);
    // validation -- not empty
        if (
            [fullname , username , email , password , country , state , city]
            .some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400 , "All Fields are required.");
        }

    // initialize the role for user.
    const allowRoles = ["guest" , "host" , "admin"];
    if (role && !allowRoles.includes(role)) {
        throw new ApiError(400 , "role is not valid.");
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
        password ,
        role : role || "guest" ,
        bio : bio || "" ,
        address : {
            country ,
            state ,
            city
        }
    })
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken");
    // check for user creation
    if (!createdUser) {
        throw new ApiError(500 , "something went wrong while registering the user.");
    }
    // return res
    return res.status(201).json(
        new ApiResponse(201 , createdUser , "User registered successfully.")
    )
})
// function to generate access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
try {
       const user =  await User.findById(userId);
       const refreshToken =  user.generateRefreshToken();
       const accessToken = user.generateAccessToken();
       console.log("User:", user);
        console.log("generateAccessToken:", user.generateAccessToken);
        console.log("generateRefreshToken:", user.generateRefreshToken);
       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave : false})
       return { accessToken, refreshToken }; 
} catch (error) {
    throw new ApiError(500 , "Something went wrong while generating access and refresh token.");
}
}
// controller for login user
const loginUser = asyncHandler(async (req , res) => {
    // req.body -> data
    const {username , email , password} = req.body;
    console.log(email);
      console.log(username);
    // check for email or username in frontend
    if (!(username || email)) {
        throw new ApiError(400 , "Username or email is required.");
    }
    // check the user exist or not in DB
    const user = await User.findOne({
        $or : [{username} , {email}]
    })
    if (!user) {
        throw new ApiError(400 , "User does not exists");
    }
    // if user exist then check for password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401 , "Invalid user's credentials");
    }
    // generate access and refresh token and retrive it from method.
    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id);
    // (Optional Step) Before sending in cookie the refresh and access token should be removed.
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
 
    return res.status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options) 
    .json(new ApiResponse(200 , {
        user : loggedInUser ,
        accessToken ,
        refreshToken
    } , "User LoggedIn Successfully."))
})
// controller for logout user
const logoutUser = asyncHandler(async (req , res) => {
    // find the user by id and update the refreshToken to undefined
    await User.findByIdAndUpdate(
        req.user._id , 
        { 
            $set : {
             refreshToken : undefined
            }
        },
        {
            new : true
        }
    )
    // clear the cookie from frontend
    // return the status code and clear the cookie
    return res.status(200)
    .clearCookie("accessToken"  , options)
    .clearCookie("refreshToken"  , options)
    .json(new ApiResponse(200 , {} , "User Logged out Successfully."));

})
// controller for refresh access token
const refreshAccessToken = asyncHandler(async (req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401 , "Unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401 , "Invalid refresh token");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401 , "Refresh token is expired or used");
        }
        const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id);
        return res.status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , refreshToken , options)
        .json(new ApiResponse(200 , {
            accessToken
        } , "Access token refreshed successfully."));
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid refresh token");
    }
})

// controller for change current password
const changeCurrentPassword = asyncHandler(async(req , res) => {
    // req.body => old , new and confirm password
    const {oldPassword , newPassword , confirmPassword} = req.body;
    // 1. Validate input
    if (!oldPassword || !newPassword || !confirmPassword) {
        throw new ApiError(400, "All password fields are required");
    }
    // ensure that new and confirm password is same.
    if (newPassword !== confirmPassword) {
        throw new ApiError(400 , "Old and new Password are not same")
    }
    // find the user in db by its id
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(400 , "User is not exist");
    }
    // check the user old password coming from req.body is correct according to database password
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400 , "Old password is incorrect");
    }
    // update the password in db.
    user.password = newPassword;
    user.save();
    // Send response
    res.status(200).json(
        new ApiResponse(200, null, "Password updated successfully")
    );
})

// controller for retrive current user.
const getCurrentUser = asyncHandler(async (req , res) => {
    return res.status(200)
    .json(new ApiResponse(200 , req.user 
        , "Current user retrived Successfully.")
    )
})
// controller to update user details.
const updateUserDetials = asyncHandler(async (req , res) => {
    // req.body => email and fullname
    const {fullname , email , bio} = req.body;
    // check the req.body info is empty or not
    if (!fullname || !email || !bio) {
        throw new ApiError( 400 , "All fields are required.");
    }
    // find the user by id and update.
    const user = await User.findByIdAndUpdate(req.user?.id , 
        {
         $set : { fullname : fullname ,  email : email  , bio : bio}
        } ,
        {
            new : true
        }
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200 , user , "User details Updated Successfully."));
})

// controller to update avatar
const updateUserAvatar = asyncHandler(async (req , res) => {
    // req.files -> extract avatar
    const avatarLocalPath = req.file?.path;
    // check if empty
    if (!avatarLocalPath) {
        throw new ApiError(400 , "avatar is required.");
    }
    // get the current user (for delete the old avatar.)
    const existingUser = await User.findById(req.user?._id);
    // validate if empty
    if (!existingUser) {
        throw new ApiError("Unauthorized User");
    }
    // delete old avatar from cloudinary.
    if (existingUser.avatar?.public_id) {
        await deleteFromCloudinary(existingUser.avatar.public_id);
    }
    // upload on cloudinary new avatar.
    const avatar = await uploadCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400 , "Avatar url is missing");
    }
     // update the user avatar in db.
    const user = await User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set : {
              avatar : avatar.url ,
              public_id: avatar.public_id,
            }
        } ,
        {new : true}
    ).select("-password")

    return res.status(200)
    .json( new ApiResponse(200 , user , "avatar is updateded Successfully."))
})

// controller for getAllUsers
const getAllUsers = asyncHandler(async (req , res) => {
    const users = await User.find().select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200 , users , "All user fetched Successfully."))
})



export {
    registerUser ,
    loginUser ,
    logoutUser ,
    refreshAccessToken ,
    changeCurrentPassword ,
    getCurrentUser ,
    updateUserDetials ,
    updateUserAvatar ,
    getAllUsers ,

 }