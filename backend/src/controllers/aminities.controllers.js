import { Amenity } from "../models/aminities.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// get all amenities
const getAllAmenties = asyncHandler(async (req , res) => {
    const amenities = await Amenity.find().sort({name : 1});
    return res.status(200)
    .json(new ApiResponse(200 , amenities , "Amenities Retrive Successfully."));
});

// create new amenity  
const createNewAmenity = asyncHandler(async (req , res) => {
    
    const {name , icon , category } = req.body;
  
    console.log(req.body)
    if (!name || !icon) {
        throw new ApiError(400 , "Name and icon are required");
    }
    const existingAmenity = await Amenity.findOne({
       name: { $regex: new RegExp(`^${name}$`, "i") }
    })
    if (existingAmenity) {
        throw new ApiError("Amentity already exists.")
    }
    const amentity = await Amenity.create({
        name : name ,
        icon : icon || "" ,
        category : category || "Basics" ,
    
    })
    return res.status(200)
    .json(new ApiResponse(200 , amentity , "Amentity Created Successfully."))
}) 

// update existing Amenity
const updateAmenity = asyncHandler(async (req , res) => {
    const { id } = req.params;

    // Auth check
    if (!req.user) {
        throw new ApiError(401, "Unauthorized user");
    }

    // Role check
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Only admin can update amenities");
    }

    // Validate request body BEFORE destructuring
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new ApiError(400, "Update data is required");
    }

    // Check amenity existence
    const existingAmenity = await Amenity.findById(id);
    if (!existingAmenity) {
        throw new ApiError(404, "Amenity not found");
    }

    // Update (partial update)
    const updatedAmenity = await Amenity.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedAmenity, "Amenity updated successfully")
    );
});

// Delete Amenities
const deleteAmenity = asyncHandler(async (req , res) => {
    const { id } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const amenity = await Amenity.findById(id);
  if (!amenity) {
    throw new ApiError(404, "Amenity not found");
  }

  // Optional: admin-only delete
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can delete amenities");
  }

  await amenity.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, {}, "Amenity deleted successfully")
  );
})

// Seed Amenity
const seedAmenities = asyncHandler(async(req , res) => {
    const commonAminities = [
  { "name": "WiFi", "category": "Basic", "icon": "📶", "isActive": true },
  { "name": "Kitchen", "category": "Basic", "icon": "🍳", "isActive": true },
  { "name": "Washer", "category": "Basic", "icon": "🧺", "isActive": true },
  { "name": "Dryer", "category": "Basic", "icon": "👕", "isActive": true },
  { "name": "Air Conditioning", "category": "Basic", "icon": "❄️", "isActive": true },
  { "name": "Heating", "category": "Basic", "icon": "🔥", "isActive": true },
  { "name": "TV", "category": "Entertainment", "icon": "📺", "isActive": true },
  { "name": "Pool", "category": "Entertainment", "icon": "🏊", "isActive": true },
  { "name": "Hot Tub", "category": "Entertainment", "icon": "♨️", "isActive": true },
  { "name": "Gym", "category": "Entertainment", "icon": "💪", "isActive": true },
  { "name": "Smoke Alarm", "category": "Safety", "icon": "🚨", "isActive": true },
  { "name": "Carbon Monoxide Alarm", "category": "Safety", "icon": "⚠️", "isActive": true },
  { "name": "First Aid Kit", "category": "Safety", "icon": "🩹", "isActive": true },
  { "name": "Fire Extinguisher", "category": "Safety", "icon": "🧯", "isActive": true },
  { "name": "Free Parking", "category": "Location", "icon": "🅿️", "isActive": true },
  { "name": "Elevator", "category": "Location", "icon": "🛗", "isActive": true },
  { "name": "Dedicated Workspace", "category": "Basic", "icon": "💻", "isActive": true },
  { "name": "Hair Dryer", "category": "Basic", "icon": "💇", "isActive": true },
  { "name": "Iron", "category": "Basic", "icon": "👔", "isActive": true },
  { "name": "Hangers", "category": "Basic", "icon": "🧥", "isActive": true },
  { "name": "Essentials", "category": "Basic", "icon": "🧴", "isActive": true },
  { "name": "Shampoo", "category": "Basic", "icon": "🧴", "isActive": true },
  { "name": "Coffee Maker", "category": "Basic", "icon": "☕", "isActive": true },
  { "name": "Microwave", "category": "Basic", "icon": "📻", "isActive": true },
  { "name": "Refrigerator", "category": "Basic", "icon": "🧊", "isActive": true },
  { "name": "Dishwasher", "category": "Basic", "icon": "🍽️", "isActive": true },
  { "name": "Oven", "category": "Basic", "icon": "🔥", "isActive": true },
  { "name": "Stove", "category": "Basic", "icon": "🍳", "isActive": true },
  { "name": "BBQ Grill", "category": "Entertainment", "icon": "🍖", "isActive": true },
  { "name": "Outdoor Dining", "category": "Entertainment", "icon": "🍴", "isActive": true },
  { "name": "Patio", "category": "Entertainment", "icon": "🌿", "isActive": true },
  { "name": "Balcony", "category": "Entertainment", "icon": "🏞️", "isActive": true },
  { "name": "Garden", "category": "Entertainment", "icon": "🌻", "isActive": true },
  { "name": "Beach Access", "category": "Location", "icon": "🏖️", "isActive": true },
  { "name": "Lake Access", "category": "Location", "icon": "🛶", "isActive": true },
  { "name": "Ski-in/Ski-out", "category": "Location", "icon": "⛷️", "isActive": true },
  { "name": "Fireplace", "category": "Entertainment", "icon": "🔥", "isActive": true },
  { "name": "Piano", "category": "Entertainment", "icon": "🎹", "isActive": true },
  { "name": "Game Console", "category": "Entertainment", "icon": "🎮", "isActive": true },
  { "name": "Board Games", "category": "Entertainment", "icon": "🎲", "isActive": true },
  { "name": "Books", "category": "Entertainment", "icon": "📚", "isActive": true },
  { "name": "Exercise Equipment", "category": "Entertainment", "icon": "🏋️", "isActive": true },
  { "name": "Sauna", "category": "Entertainment", "icon": "🧖", "isActive": true },
  { "name": "Wine Cellar", "category": "Entertainment", "icon": "🍷", "isActive": true },
  { "name": "Home Theater", "category": "Entertainment", "icon": "🎬", "isActive": true },
  { "name": "Sound System", "category": "Entertainment", "icon": "🔊", "isActive": true },
  { "name": "Security Cameras", "category": "Safety", "icon": "📹", "isActive": true },
  { "name": "Lockbox", "category": "Safety", "icon": "🔐", "isActive": true },
  { "name": "Safe", "category": "Safety", "icon": "🔒", "isActive": true },
  { "name": "EV Charger", "category": "Location", "icon": "🔌", "isActive": true },
  { "name": "Bike Storage", "category": "Location", "icon": "🚲", "isActive": true },
  { "name": "Kayak", "category": "Entertainment", "icon": "🛶", "isActive": true },
  { "name": "Beach Toys", "category": "Entertainment", "icon": "🏖️", "isActive": true },
  { "name": "Baby Safety Gates", "category": "Safety", "icon": "👶", "isActive": true },
  { "name": "High Chair", "category": "Basic", "icon": "🪑", "isActive": true },
  { "name": "Crib", "category": "Basic", "icon": "🛏️", "isActive": true },
  { "name": "Pack n Play", "category": "Basic", "icon": "🧸", "isActive": true },
  { "name": "Pet Friendly", "category": "Basic", "icon": "🐕", "isActive": true },
  { "name": "Breakfast Included", "category": "Basic", "icon": "🥐", "isActive": true },
  { "name": "Long Term Stays", "category": "Basic", "icon": "📅", "isActive": true },
  { "name": "Self Check-in", "category": "Basic", "icon": "🔑", "isActive": true },
  { "name": "Keypad Entry", "category": "Basic", "icon": "🔢", "isActive": true },
  { "name": "Smart Lock", "category": "Basic", "icon": "🔐", "isActive": true },
  { "name": "Doorman", "category": "Location", "icon": "🚪", "isActive": true },
  { "name": "Concierge", "category": "Location", "icon": "🎩", "isActive": true },
  { "name": "Luggage Storage", "category": "Basic", "icon": "🧳", "isActive": true },
  { "name": "Private Entrance", "category": "Basic", "icon": "🚪", "isActive": true },
  { "name": "Waterfront", "category": "Location", "icon": "🌊", "isActive": true },
  { "name": "Mountain View", "category": "Location", "icon": "⛰️", "isActive": true },
  { "name": "City View", "category": "Location", "icon": "🏙️", "isActive": true },
  { "name": "Ocean View", "category": "Location", "icon": "🌊", "isActive": true },
  { "name": "Beachfront", "category": "Location", "icon": "🏝️", "isActive": true }
];

     // check the aminity is alrady exists
    const existingCount = await Amenity.countDocuments();
    if (existingCount > 0) {
        throw new ApiError(400 , "Amenity already exists.")
    }
    // insert the documents to amenity collection.
    const amenities = await Amenity.insertMany(commonAminities)
    return res.status(200)
    .json(new ApiResponse(200 , amenities , "Aminities Created Successfully."));
})

export {
    seedAmenities ,
    getAllAmenties ,
    createNewAmenity ,
    updateAmenity ,
    deleteAmenity ,
} 