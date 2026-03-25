import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const listingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    price: { type: Number, required: true, default: 500 },
    price_bucket: { type: Number, default: 1 },
    images: [{ type: String, required: true }],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    location: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Amenity" }],
    maxGuests: Number,
    bedrooms: Number,
    beds: Number,
    bathrooms: Number,
    isGuestFavourite: { type: Boolean, default: false },
    tags: [{ type: String }],
    cleaningFee: { type: Number, default: 0 },
    weeklyDiscount: { type: Number, default: 0 },
    monthlyDiscount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    numberOfRatings: { type: Number, default: 0 },

    // ── NEW FIELD ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "inactive"],
      default: "pending",
      index: true,
    },
    adminNote: {
      // optional message from admin explaining rejection
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },

  },
  { timestamps: true }
);

listingSchema.plugin(mongooseAggregatePaginate);

export const Listing = mongoose.model("Listing", listingSchema);