import { Router } from "express";
import { Review } from "../models/reviews.models.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth-middleware.js";
import {
  createReviews, deleteReviews, getListingReviews,
  getReviewsById, getReviewStats, updateReviews, getHostReviews
} from "../controllers/reviews.controllers.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router = Router();

// ⚠️ IMPORTANT: /admin/all must come BEFORE /:listingId or /:reviewId
router.get("/admin/all", verifyJWT, verifyAdmin, async (req, res) => {
  const { page = 1, limit = 50, rating } = req.query;
  const filter = rating ? { rating: Number(rating) } : {};
  const skip = (Number(page) - 1) * Number(limit);

  const reviews = await Review.find(filter)
    .populate("user", "fullname email avatar")
    .populate("listing", "title images location")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Review.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, { reviews, total }, "All reviews fetched.")
  );
});

// Specific named routes first
router.post("/create/:listingId",         verifyJWT, createReviews);
router.patch("/update/:reviewId",         verifyJWT, updateReviews);
router.delete("/delete/:reviewId",        verifyJWT, deleteReviews);
// for host reviews
router.get("/host/:hostId", getHostReviews);
// Parameterized routes last
router.get("/:listingId/reviews",         verifyJWT, getListingReviews);
router.get("/:listingId/stats",           verifyJWT, getReviewStats);
router.get("/:reviewId",                 verifyJWT, getReviewsById);

export default router;