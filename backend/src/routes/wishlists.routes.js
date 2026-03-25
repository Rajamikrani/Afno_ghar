import { Router } from "express"
import { verifyJWT } from "../middleware/auth-middleware.js";
import { getMyWishList, toggleWishlist } from "../controllers/wishlists.controllers.js";
const router = Router()

router.route("/my-wishlist").get(verifyJWT , getMyWishList)
router.route("/toggle/:listingId").post(verifyJWT , toggleWishlist)
export default router;