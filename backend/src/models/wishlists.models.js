import mongoose from "mongoose";
const wishlistSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true },
    listings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing"
    }],
});

export const Wishlist = mongoose.model("Wishlist", wishlistSchema);
