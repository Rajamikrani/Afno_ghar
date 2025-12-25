import User from "../models/users.models.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async(req , _ , next) => {
  try {
    // get the token from cookie or reader
      const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer " , "");
    // check the token is avaliable or not
      if (!token) {
          throw new ApiError("Unauthorized Token.");
      }
    // decode the token using jwt verify method
      const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET);
    // find the user with help of decodedToken to retrive the id that want to logout  
      const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    // check for authorization of the user
      if (!user) {
          throw new ApiError(401 , "Invalid User Autherization.");
      }
    // pass the data (accessToken) of user to the req.user
      req.user = user;
    // call the next function that is the flag to say that hey my work is done
      next();
  } catch (error) {
    throw new ApiError(400 , "Unauthorized User.");
  }
})

const verifyAdmin = asyncHandler(async (req, res, next) => {
    // Check if user exists (from verifyJWT middleware)
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }
    // Check if user has admin role
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    next();
});

export {verifyJWT , verifyAdmin}