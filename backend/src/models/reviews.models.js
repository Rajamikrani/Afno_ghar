import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
} , {timestamps : true});

export const Review = mongoose.model("Review", reviewSchema);
