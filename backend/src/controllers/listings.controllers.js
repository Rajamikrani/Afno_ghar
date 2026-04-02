import { Listing } from "../models/listings.models.js";
import { Amenity } from "../models/aminities.models.js";
import { Booking } from "../models/bookings.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import Category from "../models/categories.model.js";
import User from "../models/users.models.js";
import mongoose from "mongoose";
import {
    calculateCosineSimilarity,
    listingToVector,
    findSimilarListings,
} from "../utils/CosineSimilarity.js";

// ─────────────────────────────────────────────────────────────
//  Helper — normalize role to array
//  Works whether role is stored as String or [String]
// ─────────────────────────────────────────────────────────────
const getRoles = (user) => [user?.role].filter(Boolean);
/* ── getAllListings — public feed, only approved listings ── */
const getAllListings = asyncHandler(async (req, res) => {
  const {
    city, country, minPrice, maxPrice, category,
    page = 1, limit = 12, host,
  } = req.query;

// To this — treats missing status as approved:
const filter = {
  $or: [
    { status: "approved" },
    { status: { $exists: false } },
    { status: null }
  ]
};
 // ← only approved shown publicly

  if (city)     filter["location.city"]    = new RegExp(city, "i");
  if (country)  filter["location.country"] = new RegExp(country, "i");
  if (category) filter.category            = category;
  if (host)     filter.host                = host;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip     = (Number(page) - 1) * Number(limit);
  const listings = await Listing.find(filter)
    .populate("host",     "fullname avatar")
    .populate("category", "name icon")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Listing.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, { listings, total, page: Number(page) }, "Listings fetched.")
  );
});

/* ── getMyListings — host sees ALL their own listings (any status) ── */
const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ host: req.user._id })
    .populate("category", "name icon")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, listings, "Your listings fetched.")
  );
});

/* ── getListingById — guests only see approved; host always sees own ── */
const getListingById = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(listingId))
    throw new ApiError(400, "Invalid listing ID.");

  const listing = await Listing.findById(listingId)
    .populate("host",      "fullname avatar bio")
    .populate("category",  "name icon")
    .populate("amenities", "name icon category");

  if (!listing) throw new ApiError(404, "Listing not found.");

  // Host can always see their own listing regardless of status
  const isOwner = req.user && String(listing.host._id) === String(req.user._id);
  const isAdmin = req.user?.role === "admin";

  if (!isOwner && !isAdmin && listing.status !== "approved") {
    throw new ApiError(404, "Listing not found.");
  }

  return res.status(200).json(
    new ApiResponse(200, listing, "Listing fetched.")
  );
});

/* ── createListing — always starts as pending ── */
const createListing = asyncHandler(async (req, res) => {
  const {
    title, description, price, category,
    maxGuests, bedrooms, beds, bathrooms,
    cleaningFee, weeklyDiscount, monthlyDiscount,
    tags, isGuestFavourite,
  } = req.body;

  if (!title || !description || !price || !category)
    throw new ApiError(400, "Title, description, price and category are required.");

  const location  = typeof req.body.location  === "string" ? JSON.parse(req.body.location)  : req.body.location;
  const amenities = typeof req.body.amenities === "string" ? JSON.parse(req.body.amenities) : req.body.amenities;

  if (!location?.coordinates?.lat || !location?.coordinates?.lng)
    throw new ApiError(400, "Location coordinates are required.");

  const files = req.files || [];
  if (!files.length) throw new ApiError(400, "At least one image is required.");

  const uploadedImages = await Promise.all(
    files.map(f => uploadCloudinary(f.path).then(r => r.secure_url))
  );

  const listing = await Listing.create({
    title, description, price: Number(price),
    host:     req.user._id,
    category,
    location,
    amenities: amenities || [],
    images:    uploadedImages,
    maxGuests: Number(maxGuests) || 1,
    bedrooms:  Number(bedrooms)  || 1,
    beds:      Number(beds)      || 1,
    bathrooms: Number(bathrooms) || 1,
    cleaningFee:      Number(cleaningFee)      || 0,
    weeklyDiscount:   Number(weeklyDiscount)   || 0,
    monthlyDiscount:  Number(monthlyDiscount)  || 0,
    tags:             tags || [],
    isGuestFavourite: isGuestFavourite || false,
    status: "pending", // ← always starts pending
  });

  return res.status(201).json(
    new ApiResponse(201, listing, "Listing created and submitted for admin approval.")
  );
});

/* ── updateListingStatus — admin only ── */
const updateListingStatus = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { status, adminNote } = req.body;

  const VALID = ["approved", "rejected", "inactive", "pending"];
  if (!VALID.includes(status))
    throw new ApiError(400, `Status must be one of: ${VALID.join(", ")}`);

  if (!mongoose.Types.ObjectId.isValid(listingId))
    throw new ApiError(400, "Invalid listing ID.");

  const listing = await Listing.findByIdAndUpdate(
    listingId,
    {
      $set: {
        status,
        adminNote:  adminNote || "",
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
    },
    { new: true }
  ).populate("host", "fullname email");

  if (!listing) throw new ApiError(404, "Listing not found.");

  return res.status(200).json(
    new ApiResponse(200, listing, `Listing ${status} successfully.`)
  );
});

/* ── adminGetAllListings — admin sees everything regardless of status ── */
const adminGetAllListings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const skip   = (Number(page) - 1) * Number(limit);

  const listings = await Listing.find(filter)
    .populate("host",     "fullname email avatar")
    .populate("category", "name icon")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Listing.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, { listings, total }, "All listings fetched.")
  );
});

/* ── deleteListing ── */
const deleteListing = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) throw new ApiError(404, "Listing not found.");

  const isOwner = String(listing.host) === String(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin)
    throw new ApiError(403, "You are not authorised to delete this listing.");

  await Listing.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(200, null, "Listing deleted successfully.")
  );
});

/* ── updateListing ── */
const updateListing = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) throw new ApiError(404, "Listing not found.");

  if (String(listing.host) !== String(req.user._id))
    throw new ApiError(403, "You are not authorised to update this listing.");

  const updates = { ...req.body };

  // ✅ Parse JSON strings sent by multipart/form-data
  if (typeof updates.location === "string") {
    try { updates.location = JSON.parse(updates.location); } catch {}
  }
  if (typeof updates.amenities === "string") {
    try { updates.amenities = JSON.parse(updates.amenities); } catch {}
  }

  // Reset to pending for re-approval
  updates.status     = "pending";
  updates.adminNote  = "";
  updates.reviewedBy = null;
  updates.reviewedAt = null;

  if (req.files?.length) {
    const uploadedImages = await Promise.all(
      req.files.map(f => uploadCloudinary(f.path).then(r => r.secure_url))
    );
    updates.images = uploadedImages;
  }

  const updated = await Listing.findByIdAndUpdate(
    id, { $set: updates }, { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updated, "Listing updated and resubmitted for approval.")
  );
});
// ─────────────────────────────────────────────────────────────
//  Search Listings (public)
// ─────────────────────────────────────────────────────────────
const searchListings = asyncHandler(async (req, res) => {
    const { query, minPrice, maxPrice, guests, category } = req.query;

    const andConditions = [];

    // Global search (flexible)
    if (query && query.trim() !== "") {
        const regex = new RegExp(query.trim(), "i");
        andConditions.push({
            $or: [
                { title: regex },
                { description: regex },
                { tags: regex },
                { "location.city": regex },
                { "location.state": regex },
                { "location.country": regex },
            ],
        });
    }

    // Category filter
    if (category && category.trim() !== "") {
        const categoryDocs = await Category.find({
            name: { $regex: category.trim(), $options: "i" },
            isActive: true,
        });

        const categoryIds = categoryDocs.map((c) => c._id);
        andConditions.push({ category: { $in: categoryIds } });
    }

    // Price filter
    if (minPrice || maxPrice) {
        const priceFilter = {};
        if (minPrice) priceFilter.$gte = Number(minPrice);
        if (maxPrice) priceFilter.$lte = Number(maxPrice);
        andConditions.push({ price: priceFilter });
    }

    // Guests filter
    if (guests && Number(guests) > 0) {
        andConditions.push({ maxGuests: { $gte: Number(guests) } });
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    console.log("Final Filter:", JSON.stringify(filter, null, 2));

    const listings = await Listing.find(filter)
        .populate("amenities", "name icon")
        .populate("category", "name")
        .populate("host", "fullName avatar email");

    return res
        .status(200)
        .json(new ApiResponse(200, listings, "Search results"));
});

// ─────────────────────────────────────────────────────────────
//  Get Similar Listings (cosine similarity)
// ─────────────────────────────────────────────────────────────
const getSimilarListings = asyncHandler(async (req, res) => {
    const { listingId } = req.params;
    const { limit = 5 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
        throw new ApiError(400, "Invalid listing ID");
    }

    const targetListing = await Listing.findById(listingId)
        .populate("amenities")
        .populate("category");

    if (!targetListing) {
        throw new ApiError(404, "Listing not found");
    }

    const allAmenities = await Amenity.find({ isActive: true });

    const minPrice = targetListing.price * 0.6;
    const maxPrice = targetListing.price * 1.4;

    const candidateListings = await Listing.find({
        _id: { $ne: listingId },
        price: { $gte: minPrice, $lte: maxPrice },
    })
        .populate("amenities")
        .populate("category")
        .populate("host", "fullName email avatar");

    const similarListings = findSimilarListings(
        targetListing,
        candidateListings,
        allAmenities,
        parseInt(limit)
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            similarListings.map((item) => ({
                ...item.listing.toObject(),
                similarityScore: Number(item.similarityScore.toFixed(4)),
            })),
            "Similar listings retrieved successfully"
        )
    );
});

// ─────────────────────────────────────────────────────────────
//  Get Personalized Recommendations
// ─────────────────────────────────────────────────────────────
const getRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log(userId)
    const { limit = 10 } = req.query;

    const userBookings = await Booking.find({ user: userId })
        .populate({
            path: "listing",
            populate: ["amenities", "category"],
        })
        .sort({ createdAt: -1 })
        .limit(3);

    if (!userBookings.length) {
        const fallback = await Listing.find()
            .sort({ averageRating: -1 })
            .limit(parseInt(limit))
            .populate("amenities")
            .populate("category")
            .populate("host", "fullName email avatar");

        return res
            .status(200)
            .json(new ApiResponse(200, fallback, "Popular listings"));
    }

    const referenceListings = userBookings.map((b) => b.listing);
    const referenceLocation =
        referenceListings[0]?.location?.coordinates || null;
    const avgPrice =
        referenceListings.reduce((sum, l) => sum + l.price, 0) /
        referenceListings.length;

    const allAmenities = await Amenity.find({ isActive: true });

    const candidates = await Listing.find({
        _id: { $nin: referenceListings.map((l) => l._id) },
    })
        .populate("amenities")
        .populate("category")
        .populate("host", "fullName email avatar");

    const recommendations = candidates
        .map((listing) => {
            const vector = listingToVector(
                listing,
                allAmenities,
                referenceLocation,
                avgPrice
            );

            const refVector = listingToVector(
                referenceListings[0],
                allAmenities,
                referenceLocation,
                avgPrice
            );

            const similarity = calculateCosineSimilarity(refVector, vector);

            return { listing, similarityScore: similarity };
        })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, parseInt(limit));

    return res.status(200).json(
        new ApiResponse(
            200,
            recommendations.map((item) => ({
                ...item.listing.toObject(),
                similarityScore: Number(item.similarityScore.toFixed(4)),
            })),
            "Personalized recommendations"
        )
    );
});

export {
    createListing,
    updateListing,
    deleteListing,
    getAllListings,
    getMyListings,
    getListingById,
    searchListings,
    getSimilarListings,
    getRecommendations ,
    updateListingStatus ,
    adminGetAllListings
};