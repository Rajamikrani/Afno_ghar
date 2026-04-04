import Category from "../models/categories.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
 
/**
 * Seed default categories
 * POST /api/categories/seed
 */
const seedCategories = asyncHandler(async (req, res) => {
  const defaultCategories = [
    { name: 'Apartment', icon: '🏢' },
    { name: 'Villa', icon: '🏰' },
    { name: 'Farmhouse', icon: '🌾'},
    { name: 'Studio', icon: '🎨' },
    { name: 'Shared Room', icon: '👥'},
    { name: 'Treehouse', icon: '🌲' },
    { name: 'Cabin', icon: '🏕️' },
    { name: 'Cottage', icon: '🏡' }
  ];

  // Check existing
  const existing = await Category.find({ name: { $in: defaultCategories.map(c => c.name) } });
  const existingNames = existing.map(c => c.name);

  const categoriesToInsert = defaultCategories.filter(c => !existingNames.includes(c.name));

  if (categoriesToInsert.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "All categories already exist"));
  }

  const insertedCategories = await Category.insertMany(categoriesToInsert);

  return res.status(201).json(new ApiResponse(
    201,
    insertedCategories,
    "Categories seeded successfully"
  ));
});

/**
 * CREATE CATEGORY
 * POST /api/categories
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon } = req.body;

  if (!name || !icon) {
    throw new ApiError(400, "Category name and icon are required");
  }

  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new ApiError(409, "Category already exists");
  }

  const category = await Category.create({
    name,
    icon
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

/**
 * GET ALL ACTIVE CATEGORIES
 * Used for index page filters
 * GET /api/categories
 */
const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select("name icon")
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

/**
 * GET CATEGORY BY ID
 * GET /api/categories/:id
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category fetched successfully"));
});

/**
 * UPDATE CATEGORY
 * PUT /api/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, icon, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (icon !== undefined) updateFields.icon = icon;
  if (isActive !== undefined) updateFields.isActive = isActive;

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!updatedCategory) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCategory, "Category updated successfully"));
});

/**
 * SOFT DELETE CATEGORY (RECOMMENDED)
 * Prevents breaking existing listings
 * PATCH /api/categories/:id/deactivate
 */
const deactivateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const category = await Category.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category deactivated successfully"));
});

/**
 * HARD DELETE CATEGORY (OPTIONAL – USE CAREFULLY)
 * DELETE /api/categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const deletedCategory = await Category.findByIdAndDelete(id);
  if (!deletedCategory) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedCategory, "Category deleted successfully"));
});

export { 
  seedCategories ,
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory,
  deleteCategory
};
