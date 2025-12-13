import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/users.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import verifyJWT from "../middleware/auth-middleware.js";
const router = Router();

router.route("/register").post(
     upload.fields([
        { name: "avatar" , maxCount : 1 }
     ]) ,
    registerUser);

router.route("/login").post(loginUser);
// Secure route to logout user
router.route("/logout").post(verifyJWT , logoutUser);
// Secure route to refresh access token
router.route("/refresh-token").post(refreshAccessToken);


export default router;