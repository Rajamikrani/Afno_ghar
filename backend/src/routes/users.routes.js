import { Router } from "express";
import { 
   loginUser, logoutUser,
   registerUser , refreshAccessToken,
   changeCurrentPassword, getCurrentUser,
   getAllUsers, updateUserAvatar,
   updateUserDetials  } from "../controllers/users.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import {verifyJWT} from "../middleware/auth-middleware.js";
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
router.route("/change-current-password").post(verifyJWT , changeCurrentPassword);
router.route("/current-user").get(verifyJWT , getCurrentUser);
router.route("/update-details").patch(verifyJWT , updateUserDetials);
router.route("/update-avatar").patch(verifyJWT , upload.single("avatar") , updateUserAvatar);
router.route("/all-users").get(verifyJWT , getAllUsers);

export default router; 