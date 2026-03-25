import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory,
  deleteCategory ,
  seedCategories
} from "../controllers/categories.controller.js";
import { verifyAdmin, verifyJWT } from "../middleware/auth-middleware.js";
const router = Router();
// Seed categories (call once)
router.route("/seedCategory").post(verifyJWT ,verifyAdmin, seedCategories);
router.route("/create").post(verifyJWT ,verifyAdmin ,  createCategory);
router.route("/").get( getAllCategories);
router.route("/:id").get( getCategoryById);
router.route("/:id/update").patch(verifyJWT , verifyAdmin ,updateCategory);
router.route("/:id/deactivate").patch(verifyJWT , verifyAdmin , deactivateCategory);
router.route("/:id/delete").delete(verifyJWT , verifyAdmin , deleteCategory);

export default router;

