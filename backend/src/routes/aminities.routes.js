import { Router } from "express";
import { verifyAdmin, verifyJWT } from "../middleware/auth-middleware.js";
import { createNewAmenity, deleteAmenity, getAllAmenties, seedAmenities, updateAmenity } from "../controllers/aminities.controllers.js";
const router = Router();
// Public route - anyone can view amenities
router.route("/").get(getAllAmenties);

// Secure routes
router.route("/admin/seed").post(verifyJWT , verifyAdmin , seedAmenities)
router.route("/admin/create-amenity").post(verifyJWT , verifyAdmin , createNewAmenity)
router.route("/admin/update-amenity/:id").patch(verifyJWT , verifyAdmin ,updateAmenity )
router.route("/admin/delete-amenity/:id").delete(verifyJWT , verifyAdmin , deleteAmenity)
export default router;