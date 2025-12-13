import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import User from "../models/users.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// Initialize the options
const options = {
    httpOnly : true ,
    secure : true
}

const registerUser = asyncHandler(async(req , res) => {
    // get user detail from frontend
        const {fullname , email , username , password , role , bio} = req.body;
        console.log("Email : " , email);
    // validation -- not empty
        if (
            [fullname , username , email , password]
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
        bio : bio || ""
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
        new ApiResponse(201 , "User Registered SuccessFully.")
    )
})

const generateAccessAndRefreshToken = async (userId) => {
try {
       const user =  await User.findById(userId);
       const refreshToken =  user.generateRefreshToken();
       const accessToken = user.generateAccessToken();
       console.log("User:", user);
        // console.log("generateAccessToken:", user.generateAccessToken);
        // console.log("generateRefreshToken:", user.generateRefreshToken);
       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave : false})
       return { accessToken, refreshToken }; 
} catch (error) {
    throw new ApiError(500 , "Something went wrong while generating access and refresh token.");
}
}

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

export {
    registerUser ,
    loginUser ,
    logoutUser ,
    refreshAccessToken
 }