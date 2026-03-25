import { Router } from "express";
import { Booking } from "../models/bookings.models.js";
import { verifyHost, verifyJWT, verifyAdmin } from "../middleware/auth-middleware.js";
import {
  cancelBooking, checkAvaliability, createBooking,
  getBookingById, getBookingStats, getHostBookings,
  getMyBookings, getPastBookings, updateBookingStatus,
  checkBookingEligibility,
} from "../controllers/bookings.controllers.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router = Router();

// ⚠️ IMPORTANT: /admin/all must come BEFORE /:id
router.get("/admin/all", verifyJWT, verifyAdmin, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const filter = status ? { status } : {};
  const skip = (Number(page) - 1) * Number(limit);

  const bookings = await Booking.find(filter)
    .populate("user", "fullname email avatar")
    .populate("listingOwner", "fullname email avatar")
    .populate({ path: "listing", select: "title images location price" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Booking.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, { bookings, total }, "All bookings fetched.")
  );
});

// Guest
router.post("/create",                        verifyJWT, createBooking);
router.get("/my-bookings",                    verifyJWT, getMyBookings);
router.get("/eligibility/:listingId",         verifyJWT, checkBookingEligibility);
router.get("/past-bookings",                  verifyJWT, getPastBookings);

// Host
router.get("/host-bookings",                  verifyJWT, verifyHost, getHostBookings);
router.get("/stats",                          verifyJWT, verifyHost, getBookingStats);

// Availability
router.get("/available/:listingId",           verifyJWT, checkAvaliability);
router.get("/avaliable/:listingId",           verifyJWT, checkAvaliability);

// Mutations
router.patch("/:id/status",                   verifyJWT, updateBookingStatus);
router.patch("/:id/cancel",                   verifyJWT, cancelBooking);

// Single — MUST be last
router.get("/:id",                            verifyJWT, getBookingById);

export default router;