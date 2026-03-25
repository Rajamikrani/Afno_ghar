import User from "../models/users.models.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
//  Core JWT verifier — always runs first
// ─────────────────────────────────────────────
const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized: No token provided.");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid User Authorization.");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized User.");
    }
});

// ─────────────────────────────────────────────
//  Admin check — role must include "admin"
// ─────────────────────────────────────────────
const verifyAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request.");
    }

    const roles = Array.isArray(req.user.role)
        ? req.user.role
        : [req.user.role];

    if (!roles.includes("admin")) {
        throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    next();
});

// ─────────────────────────────────────────────
//  Host check — role must include "host"
//  ✅ Also allows users with ["guest","host"] (dual-role)
// ─────────────────────────────────────────────
const verifyHost = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request.");
    }

    const roles = Array.isArray(req.user.role)
        ? req.user.role
        : [req.user.role];

    if (!roles.includes("host") && !roles.includes("admin")) {
        throw new ApiError(403, "Access denied. Host privileges required.");
    }

    next();
});

// ─────────────────────────────────────────────
//  Logged-in check only — any authenticated user
//  Use this on createListing so guests can also list
// ─────────────────────────────────────────────
const verifyLoggedIn = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, "You must be logged in.");
    }
    next();
});

export { verifyJWT, verifyAdmin, verifyHost, verifyLoggedIn };