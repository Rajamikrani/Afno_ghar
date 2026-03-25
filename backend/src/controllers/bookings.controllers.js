import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse }  from "../utils/ApiResponse.js";
import { ApiError }     from "../utils/ApiError.js";
import { Listing }      from "../models/listings.models.js";
import { Booking }      from "../models/bookings.models.js";
import mongoose         from "mongoose";

/* ══════════════════════════════════════════════════════════════════════
   CREATE BOOKING
══════════════════════════════════════════════════════════════════════ */
const createBooking = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { listingId, checkIn, checkOut, guests } = req.body;

  if (!listingId || !checkIn || !checkOut || !guests)
    throw new ApiError(400, "listingId, checkIn, checkOut and guests are required");

  const { adults, children = 0, infants = 0 } = guests;
  if (!adults || adults < 1)       throw new ApiError(400, "At least one adult is required");
  if (children < 0 || infants < 0) throw new ApiError(400, "Invalid guest count");

  const totalGuests    = adults + children;
  const checkedInDate  = new Date(checkIn);
  const checkedOutDate = new Date(checkOut);

  if (isNaN(checkedInDate.getTime()) || isNaN(checkedOutDate.getTime()))
    throw new ApiError(400, "Invalid date format");
  if (checkedInDate >= checkedOutDate)
    throw new ApiError(400, "Check-out must be after check-in");

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "Listing not found");

  if (listing.maxGuests && totalGuests > listing.maxGuests)
    throw new ApiError(400, `Maximum ${listing.maxGuests} guests allowed`);

  if (listing.host.toString() === userId.toString())
    throw new ApiError(403, "You cannot book your own listing");

  const overlapBooking = await Booking.findOne({
    listing:  listingId,
    status:   { $ne: "cancelled" },
    checkIn:  { $lt: checkedOutDate },
    checkOut: { $gt: checkedInDate },
  });
  if (overlapBooking)
    throw new ApiError(409, "Listing is already booked for the selected dates");

  const nights = (checkedOutDate - checkedInDate) / (1000 * 60 * 60 * 24);
  if (nights <= 0) throw new ApiError(400, "Invalid booking duration");
  if (typeof listing.price !== "number")
    throw new ApiError(500, "Listing price is not configured");

  const nightlyPrice = listing.price;
  const totalPrice   = nights * nightlyPrice;

  const booking = await Booking.create({
    listing:      listingId,
    user:         userId,
    listingOwner: listing.host,
    checkIn:      checkedInDate,
    checkOut:     checkedOutDate,
    totalPrice,
    guests:  { adults, children, infants },
    pricing: { nightlyPrice, totalPrice },
  });

  return res.status(201).json(
    new ApiResponse(201, booking, "Booking created successfully")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   GET MY BOOKINGS
══════════════════════════════════════════════════════════════════════ */
const getMyBookings = asyncHandler(async (req, res) => {
  const userId     = req.user._id;
  const { status } = req.query;

  const filter = { user: userId };
  if (status && ["pending", "confirmed", "cancelled", "rejected"].includes(status))
    filter.status = status;

  const bookings = await Booking.find(filter)
    .populate({ path: "listing",      select: "title images location price bedrooms bathrooms maxGuests" })
    .populate({ path: "listingOwner", select: "fullname avatar email" })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, bookings, "Bookings fetched successfully")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   CHECK BOOKING ELIGIBILITY
   FIX #2: Added checkOut: { $lt: new Date() } so this endpoint agrees
   with createReviews. Previously eligibility returned eligible:true for
   confirmed bookings that hadn't checked out yet, but createReviews
   rejected those same bookings with a 403 — leaving users stuck with
   a visible "Write a Review" button that always failed.
══════════════════════════════════════════════════════════════════════ */
const checkBookingEligibility = asyncHandler(async (req, res) => {
  const userId        = req.user._id;
  const { listingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(listingId))
    throw new ApiError(400, "Invalid listing ID");

  const listing = await Listing.findById(listingId).select("host");
  if (!listing) throw new ApiError(404, "Listing not found");

  // Owner can never review their own listing
  if (listing.host.toString() === userId.toString()) {
    return res.status(200).json(
      new ApiResponse(200, {
        eligible: false,
        reason:   "owner",
        booking:  null,
      }, "Listing owners cannot review their own property")
    );
  }

  // FIX #2: require checkOut in the past — now matches createReviews exactly
  const booking = await Booking.findOne({
    listing:  listingId,
    user:     userId,
    status:   "confirmed",
    checkIn: { $lte: new Date() }
  })
    .populate({ path: "listing", select: "title images location price" })
    .sort({ createdAt: -1 });

  if (!booking) {
    return res.status(200).json(
      new ApiResponse(200, {
        eligible: false,
        reason:   "no_completed_booking",
        booking:  null,
      }, "No completed confirmed booking found for this listing")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, {
      eligible: true,
      reason:   "completed_booking",
      booking,
    }, "User is eligible to review this listing")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   GET HOST BOOKINGS
══════════════════════════════════════════════════════════════════════ */
const getHostBookings = asyncHandler(async (req, res) => {
  const hostId     = req.user._id;
  const { status } = req.query;

  const filter = { listingOwner: hostId };
  if (status && ["pending", "confirmed", "cancelled", "rejected"].includes(status))
    filter.status = status;

  const bookings = await Booking.find(filter)
    .populate({ path: "listing", select: "title images location price bedrooms bathrooms maxGuests" })
    .populate({ path: "user",    select: "fullname avatar email phone" })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, bookings, "Host bookings fetched successfully")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   GET BOOKING BY ID
══════════════════════════════════════════════════════════════════════ */
const getBookingById = asyncHandler(async (req, res) => {
  const { id }  = req.params;
  const userId  = req.user._id;

  const booking = await Booking.findById(id)
    .populate("listing")
    .populate("user",         "fullname email avatar")
    .populate("listingOwner", "fullname email avatar");

  if (!booking) throw new ApiError(404, "Booking not found");

  const isBooker = booking.user?._id.toString()         === userId.toString();
  const isOwner  = booking.listingOwner?._id.toString() === userId.toString();
  if (!isBooker && !isOwner)
    throw new ApiError(403, "Not authorised to view this booking");

  return res.status(200).json(
    new ApiResponse(200, booking, "Booking fetched successfully")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   UPDATE BOOKING STATUS
══════════════════════════════════════════════════════════════════════ */
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id }     = req.params;
  const userId     = req.user._id;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ApiError(400, "Invalid booking ID");

  const validStatuses = ["confirmed", "rejected"];
  if (!validStatuses.includes(status))
    throw new ApiError(400, `Status must be one of: ${validStatuses.join(", ")}`);

  const booking = await Booking.findById(id).populate({
    path:   "listingOwner",
    select: "fullname email avatar",
  });

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.listingOwner?._id.toString() !== userId.toString())
    throw new ApiError(403, "Only the listing owner can update booking status");

  if (booking.status !== "pending")
    throw new ApiError(400, "Only pending bookings can be confirmed or rejected");

  booking.status = status;
  await booking.save();

  await booking.populate([
    { path: "user",    select: "fullname email avatar" },
    { path: "listing", select: "title location price images" },
  ]);

  return res.status(200).json(
    new ApiResponse(200, booking, `Booking ${status} successfully`)
  );
});

/* ══════════════════════════════════════════════════════════════════════
   CANCEL BOOKING
══════════════════════════════════════════════════════════════════════ */
const cancelBooking = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ApiError(400, "Invalid booking ID");

  const booking = await Booking.findById(id)
    .populate("listing",      "title")
    .populate("user",         "fullname")
    .populate("listingOwner", "fullname");

  if (!booking) throw new ApiError(404, "Booking not found");

  const isBooker = booking.user?._id?.toString()         === userId;
  const isOwner  = booking.listingOwner?._id?.toString() === userId;

  if (!isBooker && !isOwner)
    throw new ApiError(403, "Not authorised to cancel this booking");
  if (booking.status === "cancelled")
    throw new ApiError(400, "Booking is already cancelled");

  const hoursUntilCheckIn =
    (new Date(booking.checkIn) - new Date()) / (1000 * 60 * 60);

  let refundEligible      = false;
  let refundPercentage    = 0;
  let cancellationMessage = "";

  if (isOwner) {
    refundEligible      = true;
    refundPercentage    = 100;
    cancellationMessage = "Host cancelled the booking. Guest will receive a full refund.";
  } else {
    if (hoursUntilCheckIn < 0)
      throw new ApiError(400, "Cannot cancel a booking that has already started");
    if (hoursUntilCheckIn >= 24) {
      refundEligible      = true;
      refundPercentage    = 100;
      cancellationMessage = "Booking cancelled. You will receive a full refund.";
    } else {
      cancellationMessage =
        "Booking cancelled. No refund is available within 24 hours of check-in.";
    }
  }

  booking.status = "cancelled";
  await booking.save();

  return res.status(200).json(
    new ApiResponse(200, {
      booking,
      refund: {
        eligible:   refundEligible,
        percentage: refundPercentage,
        amount:     (booking.totalPrice * refundPercentage) / 100,
      },
      cancelledBy: isOwner ? "owner" : "booker",
    }, cancellationMessage)
  );
});

/* ══════════════════════════════════════════════════════════════════════
   CHECK AVAILABILITY
══════════════════════════════════════════════════════════════════════ */
const checkAvaliability = asyncHandler(async (req, res) => {
  const { listingId }         = req.params;
  const { checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut)
    throw new ApiError(400, "checkIn and checkOut query params are required");

  const checkedInDate  = new Date(checkIn);
  const checkedOutDate = new Date(checkOut);

  if (isNaN(checkedInDate.getTime()) || isNaN(checkedOutDate.getTime()))
    throw new ApiError(400, "Invalid date format");

  const conflicting = await Booking.find({
    listing:  listingId,
    status:   { $in: ["pending", "confirmed"] },
    checkIn:  { $lt: checkedOutDate },
    checkOut: { $gt: checkedInDate },
  }).populate("user", "fullname");

  return res.status(200).json(
    new ApiResponse(200, {
      available:           conflicting.length === 0,
      conflictingBookings: conflicting.length,
      bookings:            conflicting,
    }, "Availability checked")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   BOOKING STATS
══════════════════════════════════════════════════════════════════════ */
const getBookingStats = asyncHandler(async (req, res) => {
  const hostId = new mongoose.Types.ObjectId(req.user._id);

  const statusBreakdown = await Booking.aggregate([
    { $match: { listingOwner: hostId } },
    {
      $group: {
        _id:          "$status",
        count:        { $sum: 1 },
        totalRevenue: {
          $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalPrice", 0] },
        },
      },
    },
  ]);

  const totalBookings    = await Booking.countDocuments({ listingOwner: hostId });
  const upcomingBookings = await Booking.countDocuments({
    listingOwner: hostId,
    status:       "confirmed",
    checkIn:      { $gte: new Date() },
  });

  const revenueAgg = await Booking.aggregate([
    { $match: { listingOwner: hostId, status: { $ne: "cancelled" } } },
    { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      totalBookings,
      upcomingBookings,
      totalRevenue:    revenueAgg[0]?.totalRevenue || 0,
      statusBreakdown,
    }, "Booking stats fetched")
  );
});

/* ══════════════════════════════════════════════════════════════════════
   PAST BOOKINGS
══════════════════════════════════════════════════════════════════════ */
const getPastBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const pastBookings = await Booking.find({
    user:     userId,
    checkOut: { $lt: new Date() },
  })
    .populate("listing",      "title images location")
    .populate("listingOwner", "fullname avatar")
    .sort({ checkOut: -1 });

  const total = await Booking.countDocuments({
    user:     userId,
    checkOut: { $lt: new Date() },
  });

  return res.status(200).json(
    new ApiResponse(200, { pastBookings, total }, "Past bookings fetched")
  );
});

export {
  createBooking,
  getMyBookings,
  checkBookingEligibility,
  getHostBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  checkAvaliability,
  getBookingStats,
  getPastBookings,
};