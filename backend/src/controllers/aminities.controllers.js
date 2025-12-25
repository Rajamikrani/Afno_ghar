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
    
    const {name , icon , category , description} = req.body;
  
    console.log(req.body)
    if (!name || !icon) {
        throw new ApiError(400 , "Name and icon are required");
    }
    const existingAmenity = await Amenity.findOne({
        name : {$regex : new RegExp(`${name}$` , 'i')}
    })
    if (existingAmenity) {
        throw new ApiError("Amentity already exists.")
    }
    const amentity = await Amenity.create({
        name : name ,
        icon : icon || "" ,
        category : category || "Basics" ,
        description : description || "Beautiful"
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
    { name: 'WiFi', category: 'Basic', icon: '📶', isActive: true },
    { name: 'Kitchen', category: 'Basic', icon: '🍳', isActive: true },
    { name: 'Washer', category: 'Basic', icon: '🧺', isActive: true },
    { name: 'Dryer', category: 'Basic', icon: '👕', isActive: true },
    { name: 'Air Conditioning', category: 'Basic', icon: '❄️', isActive: true },
    { name: 'Heating', category: 'Basic', icon: '🔥', isActive: true },
    { name: 'TV', category: 'Entertainment', icon: '📺', isActive: true },
    { name: 'Pool', category: 'Entertainment', icon: '🏊', isActive: true },
    { name: 'Hot Tub', category: 'Entertainment', icon: '♨️', isActive: true },
    { name: 'Gym', category: 'Entertainment', icon: '💪', isActive: true },
    { name: 'Smoke Alarm', category: 'Safety', icon: '🚨', isActive: true },
    { name: 'Carbon Monoxide Alarm', category: 'Safety', icon: '⚠️', isActive: true },
    { name: 'First Aid Kit', category: 'Safety', icon: '🩹', isActive: true },
    { name: 'Fire Extinguisher', category: 'Safety', icon: '🧯', isActive: true },
    { name: 'Free Parking', category: 'Location', icon: '🅿️', isActive: true },
    { name: 'Elevator', category: 'Location', icon: '🛗', isActive: true }
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