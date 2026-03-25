import { Router } from "express";
import {
  loginUser, logoutUser, registerUser, refreshAccessToken,
  changeCurrentPassword, getCurrentUser, getAllUsers,
  updateUserAvatar, updateUserDetials, getUserById,
  getListingHost, updateUserRole, deleteUser,
} from "../controllers/users.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth-middleware.js";

const router = Router();

// Public
router.post("/register", upload.fields([{ name: "avatar", maxCount: 1 }]), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// Authenticated
router.post("/logout",                  verifyJWT, logoutUser);
router.post("/change-current-password", verifyJWT, changeCurrentPassword);
router.get("/current-user",             verifyJWT, getCurrentUser);
router.patch("/update-details",         verifyJWT, updateUserDetials);
router.patch("/update-avatar",          verifyJWT, upload.single("avatar"), updateUserAvatar);

// ⚠️ IMPORTANT: specific routes BEFORE /:id — order matters in Express
router.get("/all",                      verifyJWT, verifyAdmin, getAllUsers);  // was /all-users, frontend expects /all
router.patch("/:id/role",              verifyJWT, verifyAdmin, updateUserRole);
router.delete("/:id",                  verifyJWT, verifyAdmin, deleteUser);
router.get("/profile/:id",             getUserById);
router.get("/:id/host",               getListingHost);

export default router;