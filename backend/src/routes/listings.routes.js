import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth-middleware.js";
import {
  createListing, deleteListing, getAllListings,
  getListingById, getMyListings, getRecommendations,
  getSimilarListings, searchListings, updateListing,
  updateListingStatus, adminGetAllListings, getHostListings , 
  getHostStats
} from "../controllers/listings.controllers.js";

const router = Router();

// ── 1. Fully static named routes ─────────────────────────────────────
router.get("/",                   getAllListings);
router.get("/admin/all",          verifyJWT, verifyAdmin, adminGetAllListings);
router.get("/my-listings",        verifyJWT, getMyListings);
router.get("/recommendations",     getRecommendations);
router.get("/search",             searchListings);

// ── 2. Host specific routes (before ANY :param routes) ───────────────
router.get("/host/:hostId/stats", getHostStats);
router.get("/host/:hostId",       getHostListings);

// ── 3. Create ─────────────────────────────────────────────────────────
router.post("/create-listing",    verifyJWT, upload.array("images", 10), createListing);

// ── 4. Similar ────────────────────────────────────────────────────────
router.get("/similar/:listingId" , getSimilarListings);

// ── 5. Update & delete ────────────────────────────────────────────────
router.patch("/update-listing/:id",  verifyJWT, upload.array("images", 10), updateListing);
router.delete("/delete-listing/:id", verifyJWT, deleteListing);
router.delete("/:id/admin",          verifyJWT, verifyAdmin, deleteListing);

// ── 6. Admin status ───────────────────────────────────────────────────
router.patch("/:listingId/status",   verifyJWT, verifyAdmin, updateListingStatus);

// ── 7. Single listing — MUST BE LAST ─────────────────────────────────
router.get("/:listingId",          getListingById);

export default router;