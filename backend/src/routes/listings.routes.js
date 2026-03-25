import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth-middleware.js";
import {
  createListing, deleteListing, getAllListings,
  getListingById, getMyListings, getRecommendations,
  getSimilarListings, searchListings, updateListing,
  updateListingStatus, adminGetAllListings,
} from "../controllers/listings.controllers.js";

const router = Router();

// ── Specific named routes FIRST ─────────────────────────────────────
router.get("/all-listings",       getAllListings);              // public, approved only
router.get("/admin/all",          verifyJWT, verifyAdmin, adminGetAllListings); // admin, all statuses
router.get("/my-listings",        verifyJWT, getMyListings);   // host, all their own
router.get("/recommendations",    verifyJWT, getRecommendations);
router.get("/search",             searchListings);

// ── Create ───────────────────────────────────────────────────────────
router.post("/create-listing",    verifyJWT, upload.array("images", 10), createListing);

// ── Similar (param route — must come after named routes) ─────────────
router.get("/similar/:listingId", verifyJWT, getSimilarListings);

// ── Update & delete ──────────────────────────────────────────────────
router.patch("/update-listings/:id",  verifyJWT, upload.array("images", 10), updateListing);
router.delete("/delete-listing/:id",  verifyJWT, deleteListing);
router.delete("/:id/admin",           verifyJWT, verifyAdmin, deleteListing);

// ── Admin: approve / reject ───────────────────────────────────────────
// PATCH /listings/:listingId/status   body: { status, adminNote? }
router.patch("/:listingId/status",    verifyJWT, verifyAdmin, updateListingStatus);

// ── Single listing (LAST — catch-all param) ──────────────────────────
router.get("/:listingId",             verifyJWT, getListingById);

export default router;