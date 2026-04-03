import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError }      from "../utils/ApiError.js";
import { ApiResponse }   from "../utils/ApiResponse.js";
import { Listing }       from "../models/listings.models.js";
import { Booking }       from "../models/bookings.models.js";
import { Review }        from "../models/reviews.models.js";
import mongoose          from "mongoose";

/* ══════════════════════════════════════════════════════════════════════
   SYNC LISTING RATING
   Recalculates averageRating + numberOfRatings on the Listing document
   after any review mutation (create / update / delete).
══════════════════════════════════════════════════════════════════════ */
const syncListingRating = async (listingId) => {
  const result = await Review.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(listingId) } },
    {
      $group: {
        _id:             null,
        averageRating:   { $avg: "$rating" },
        numberOfRatings: { $sum: 1 },
      },
    },
  ]);

  const averageRating   = result[0]?.averageRating
    ? parseFloat(result[0].averageRating.toFixed(1))
    : 0;
  const numberOfRatings = result[0]?.numberOfRatings ?? 0;

  await Listing.findByIdAndUpdate(listingId, { averageRating, numberOfRatings });
};

/* ══════════════════════════════════════════════════════════════════════
   CREATE / UPSERT REVIEW
   ─────────────────────────────────────────────────────────────────────
   WHO CAN REVIEW:
     • Guest  — must have a confirmed booking on this listing as `user`
     • Host   — must be the `listingOwner` on a confirmed booking for
                this listing (they review on behalf of the guest stay)

   UPSERT:  If the caller already has a review for this listing, we
            update it instead of throwing 400.  This lets the frontend
            call createReview for both create and edit flows.

   ELIGIBILITY:  We require checkIn <= now (stay has begun).  We do NOT
                 require checkOut < now so that hosts can review during
                 a stay if needed — but the frontend only shows the
                 button after checkout anyway.
══════════════════════════════════════════════════════════════════════ */
const createReviews = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  const { listingId }      = req.params;
  const userId             = req.user._id;

  console.log("createReview — body:", req.body, "| listingId:", listingId, "| userId:", userId);

  /* ── Validate inputs ── */
  if (!rating || rating < 1 || rating > 5)
    throw new ApiError(400, "Rating must be between 1 and 5.");

  if (!review || review.trim().length < 10)
    throw new ApiError(400, "Review text must be at least 10 characters.");

  /* ── Listing must exist ── */
  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "Listing not found.");

  /* ── Check eligibility ──────────────────────────────────────────────
     Look for a confirmed booking where the caller is EITHER:
       (a) the guest  (user field)           — normal guest review
       (b) the host   (listingOwner field)   — host reviewing their listing
                                               on behalf of a guest stay
  ────────────────────────────────────────────────────────────────────── */
  const eligibleBooking = await Booking.findOne({
    listing: listingId,
    status:  "confirmed",
    checkIn: { $lte: new Date() },
    $or: [
      { user:         userId },   // caller is the guest
      { listingOwner: userId },   // caller is the host
    ],
  }).sort({ createdAt: -1 });

  if (!eligibleBooking)
    throw new ApiError(
      403,
      "You can only review after a confirmed stay has begun. " +
      "Make sure you have a confirmed booking for this listing."
    );

  /* ── Upsert: update if exists, create if not ── */
  const existingReview = await Review.findOne({ listing: listingId, user: userId });

  let savedReview;
  if (existingReview) {
    existingReview.rating = rating;
    existingReview.review = review.trim();
    savedReview = await existingReview.save();
  } else {
    savedReview = await Review.create({
      listing: listingId,
      booking: eligibleBooking._id,
      user:    userId,
      rating,
      review:  review.trim(),
    });
  }

  await savedReview.populate("user", "fullname avatar");
  await syncListingRating(listingId);

  const isUpdate   = !!existingReview;
  const statusCode = isUpdate ? 200 : 201;
  const message    = isUpdate ? "Review updated successfully." : "Review created successfully.";

  return res.status(statusCode).json(new ApiResponse(statusCode, savedReview, message));
});

/* ══════════════════════════════════════════════════════════════════════
   UPDATE REVIEW
══════════════════════════════════════════════════════════════════════ */
const updateReviews = asyncHandler(async (req, res) => {
  const { reviewId }       = req.params;
  const { rating, review } = req.body;
  const userId             = req.user._id;

  if (rating !== undefined && (rating < 1 || rating > 5))
    throw new ApiError(400, "Rating must be between 1 and 5.");

  const existingReview = await Review.findById(reviewId);
  if (!existingReview) throw new ApiError(404, "Review not found.");

  if (existingReview.user.toString() !== userId.toString())
    throw new ApiError(403, "You can only update your own review.");

  if (rating !== undefined) existingReview.rating = rating;
  if (review !== undefined) existingReview.review = review;

  await existingReview.save();
  await existingReview.populate("user", "fullname avatar");
  await syncListingRating(existingReview.listing.toString());

  return res.status(200).json(
    new ApiResponse(200, existingReview, "Review updated successfully.")
  );
});

const getHostReviews = asyncHandler(async (req, res) => {
  const { hostId } = req.params;
  const { page = 1, limit = 6 } = req.query;

  // Find all listings by this host
  const listings = await Listing.find({ host: hostId }).select("_id");
  const listingIds = listings.map(l => l._id);

  const skip = (Number(page) - 1) * Number(limit);

  const reviews = await Review.find({ listing: { $in: listingIds } })
    .populate("user", "fullname avatar")
    .populate("listing", "title images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Review.countDocuments({ listing: { $in: listingIds } });

  return res.status(200).json(
    new ApiResponse(200, { reviews, total }, "Host reviews fetched.")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   GET REVIEW BY ID
══════════════════════════════════════════════════════════════════════ */
const getReviewsById = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId)
    .populate("user",    "fullname avatar")
    .populate("listing", "title images address");

  if (!review) throw new ApiError(404, "Review not found.");

  return res.status(200).json(
    new ApiResponse(200, review, "Review fetched successfully.")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   DELETE REVIEW
══════════════════════════════════════════════════════════════════════ */
const deleteReviews = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId       = req.user._id;

  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, "Review not found.");

  if (review.user.toString() !== userId.toString())
    throw new ApiError(403, "You can only delete your own review.");

  const listingId = review.listing;
  await Review.findByIdAndDelete(reviewId);
  await syncListingRating(listingId);

  return res.status(200).json(
    new ApiResponse(200, null, "Review deleted successfully.")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   GET LISTING REVIEWS  (paginated)
══════════════════════════════════════════════════════════════════════ */
const getListingReviews = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(listingId))
    throw new ApiError(400, "Invalid listing ID.");

  const listingExists = await Listing.exists({ _id: listingId });
  if (!listingExists) throw new ApiError(404, "Listing not found.");

  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.max(1, Number(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const reviews = await Review.find({ listing: listingId })
    .populate("user", "fullname avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalReviews = await Review.countDocuments({ listing: listingId });

  return res.status(200).json(
    new ApiResponse(200, {
      reviews,
      pagination: {
        total:      totalReviews,
        page,
        limit,
        totalPages: Math.ceil(totalReviews / limit),
      },
    }, "Listing reviews fetched successfully.")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   GET REVIEW STATS
══════════════════════════════════════════════════════════════════════ */
const getReviewStats = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(listingId))
    throw new ApiError(400, "Invalid listing ID.");

  const stats = await Review.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(listingId) } },
    {
      $facet: {
        ratingDistribution: [
          { $group: { _id: "$rating", count: { $sum: 1 } } },
          { $sort:  { _id: -1 } },
        ],
        overall: [
          {
            $group: {
              _id:           null,
              averageRating: { $avg: "$rating" },
              totalReviews:  { $sum: 1 },
              highestRating: { $max: "$rating" },
              lowestRating:  { $min: "$rating" },
            },
          },
        ],
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      statistics: stats[0] || { ratingDistribution: [], overall: [] },
    }, "Review stats fetched successfully.")
  );
});

export {
  createReviews,
  updateReviews,
  getReviewsById,
  deleteReviews,
  getListingReviews,
  getReviewStats,
  getHostReviews
};