import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  // FIX #1: renamed from `comment` → `review` to match controller + frontend
  review: {
    type: String,
    trim: true,
    default: "",
  },
}, { timestamps: true });

// FIX #3: one review per USER per LISTING (not per booking)
// This prevents a clean 400 instead of a raw Mongo duplicate-key crash,
// and correctly blocks a user from reviewing the same listing twice
// even if they have multiple past bookings there.
reviewSchema.index({ listing: 1, user: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);