    import {asyncHandler} from "../utils/asyncHandler.js";
    import {ApiError} from "../utils/ApiError.js";
    import User from "../models/users.models.js";
    import { Listing } from "../models/listings.models.js";
    import { ApiResponse } from "../utils/ApiResponse.js";
    import { uploadCloudinary , deleteFromCloudinary } from "../utils/cloudinary.js";
    import jwt from "jsonwebtoken";
    import mongoose from "mongoose";

    // Initialize the options
    const options = {
        httpOnly : true ,
        secure: process.env.NODE_ENV === "production",
          sameSite: "None" 
    }

    // controller for register user
    const registerUser = asyncHandler(async (req, res) => {

        const { fullname, email, username, password, role, bio } = req.body;
        const country = req.body?.address?.country;
        const state = req.body?.address?.state;
        const city = req.body?.address?.city;
        if (!fullname || !username || !email || !password || !country) {
            throw new ApiError(400, "Required fields missing.");
        }
        const existedUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });
        if (existedUser) {
            throw new ApiError(409, "User already exists.");
        }
        const avatarLocalPath = req.files?.avatar?.[0]?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file missing.");
        }
        const uploadedAvatar = await uploadCloudinary(avatarLocalPath);

        if (!uploadedAvatar?.secure_url) {
            throw new ApiError(500, "Cloudinary upload failed.");
        }
        const user = await User.create({
            fullname,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            avatar: uploadedAvatar.secure_url,
            role: role || "guest",
            bio: bio || "",
            address: {
                country,
                state,
                city
            }
        });
        const createdUser = await User.findById(user._id)
            .select("-password -refreshToken");
        return res.status(201).json(
            new ApiResponse(201, createdUser, "User registered successfully.")
        );
    });

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
        throw new ApiError(500 ,
             "Something went wrong while generating access and refresh token.");
    }
    }

    // controller for login user
    const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!password || !(username || email)) {
        throw new ApiError(400, "Username or email and password are required");
    }
    const query = [];
    if (username) query.push({ username: username.toLowerCase() });
    if (email) query.push({ email: email.toLowerCase() });
    const user = await User.findOne({ $or: query });
    if (!user) {
        throw new ApiError(400, "User does not exists");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
        new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken },
             "User LoggedIn Successfully.")
        );
    });


    // controller for logout user
    const logoutUser = asyncHandler(async (req , res) => {
        console.log("LOGOUT USER:", req.user);
console.log("COOKIES:", req.cookies);
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


    const updateUserAvatar = asyncHandler(async (req, res) => {

    // 1️ Get file path from multer
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
    }

    // 2️ Validate user
    const existingUser = await User.findById(req.user?._id);

    if (!existingUser) {
        throw new ApiError(401, "Unauthorized User");
    }

    // 3️ OPTIONAL:
    // If you previously stored public_id separately and want deletion,
    // you must extract public_id from stored URL (not ideal).
    // Otherwise skip deletion if you don't store public_id.

    // 4️ Upload to Cloudinary
    const uploadResult = await uploadCloudinary(avatarLocalPath);

    if (!uploadResult || !uploadResult.secure_url) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // 5️ Update avatar as STRING
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: uploadResult.secure_url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Avatar updated successfully.")
    );
});

    // controller for getAllUsers
    const getAllUsers = asyncHandler(async (req , res) => {
        const users = await User.find().select("-password -refreshToken")
        return res.status(200).json(new ApiResponse(200 , users , "All user fetched Successfully."))
    })

 const getUserById = asyncHandler(async (req, res) => {
    console.log('✅ getUserById HIT — id:', req.params.id); // ← add this
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  const user = await User.findById(id)
    .select("-password -refreshToken")
    // .populate("languages", "name");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

    const getListingHost = asyncHandler(async (req, res) => {
    const { id } = req.params;

    //  Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
        success: false,
        message: "Invalid listing ID",
        });
    }

    //  Find listing & populate only host
    const listing = await Listing.findById(id)
        .populate({
        path: "host",
        select: "fullname email avatar createdAt", // 🔥 only public fields
        })
        .select("host"); // only return host

    if (!listing) {
        return res.status(404).json({
        success: false,
        message: "Listing not found",
        });
    }

    res.status(200).json({
        success: true,
        data: listing.host,
    });
    });

    // PATCH /users/:id/role — admin only
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["guest", "host", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role. Must be guest, host, or admin.");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID.");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { role } },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) throw new ApiError(404, "User not found.");

  return res.status(200).json(
    new ApiResponse(200, user, "User role updated successfully.")
  );
});

// DELETE /users/:id — admin only
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID.");
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) throw new ApiError(404, "User not found.");

  return res.status(200).json(
    new ApiResponse(200, null, "User deleted successfully.")
  );
});

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
        getUserById ,
        getListingHost ,
        updateUserRole ,
        deleteUser
    }