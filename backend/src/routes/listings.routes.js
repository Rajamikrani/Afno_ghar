import { Router } from "express";  
import { upload } from "../middleware/multer.middleware.js";
import {verifyJWT} from "../middleware/auth-middleware.js";
import { createListing, getAllListings } from "../controllers/listings.controllers.js";
const router = Router();

router.route("/create-listing").post(
    verifyJWT,
    upload.array("images" , 10) ,
    createListing);

router.route("/all-listings").get(verifyJWT , getAllListings);

export default router;
