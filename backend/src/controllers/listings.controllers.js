import { Listing } from "../models/listings.models.js";
import { Amenity } from "../models/aminities.models.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadCloudinary } from "../utils/cloudinary.js";

// Create Listings
const createListing = asyncHandler(async (req , res) => {
    // Extract listing data from request body
    const {
        title,
        description,
        price,
        category,
        location,
        amenities,
        maxGuests,
        bedrooms,
        beds,
        bathrooms,
        tags
    } = req.body;

    // Validate required fields
    if (!title || !description || !price || !category) {
        throw new ApiError(400, "Title, description, price, and category are required");
    }

// Step 1: Parse amenities (from form-data)
const parsedAmenities =
  typeof amenities === "string" ? JSON.parse(amenities) : amenities;

// Step 2: Validate it's an array
if (!Array.isArray(parsedAmenities)) {
  throw new ApiError(400, "Amenities must be an array of IDs");
}

// Step 3: Validate IDs exist and are active
const validAmenities = await Amenity.find({
  _id: { $in: parsedAmenities },
  isActive: true
});

// Step 4: Compare lengths correctly
if (validAmenities.length !== parsedAmenities.length) {
  const validIds = validAmenities.map(a => a._id.toString());
  const invalidIds = parsedAmenities.filter(id => !validIds.includes(id));
  return res.status(400).json({
    success: false,
    message: 'Some amenities are invalid',
    invalidAmenities: invalidIds // ← shows exactly which IDs are invalid
  });
}

        

    // Parse location if it's a string
    const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

    // Validate location coordinates
    if (!parsedLocation?.coordinates || !Array.isArray(parsedLocation.coordinates) || parsedLocation.coordinates.length !== 2) {
        throw new ApiError(400, "Valid location coordinates [longitude, latitude] are required");
    }

    // Validate category
    const validCategories = ["apartment", "villa", "farmhouse", "studio", "shared-room", "treehouse"];
    if (!validCategories.includes(category)) {
        throw new ApiError(400, "Invalid category");
    }

    // Handle image uploads - Multer stores files in req.files when using .array()
    let imageUrls = [];
    
    console.log("req.files:", req.files); // Debug log
    
    if (req.files && req.files.length > 0) {
        // Upload each image to cloudinary
        for (const imageFile of req.files) {
            const uploadedImage = await uploadCloudinary(imageFile.path);
            if (uploadedImage) {
                imageUrls.push(uploadedImage.url);
            }
        }

        if (imageUrls.length === 0) {
            throw new ApiError(400, "Failed to upload images");
        }
    } else {
        throw new ApiError(400, "At least one image is required");
    }

    // Calculate price bucket
    // let priceBucket;
    // if (price < 100) {
    //     priceBucket = 1;
    // } else if (price <= 300) {
    //     priceBucket = 2;
    // } else {
    //     priceBucket = 3;
    // }

    // Parse arrays if they're strings
    // const parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
    // const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

    // Create listing
    const listing = await Listing.create({
        title : title,
        description : description,
        host: req.user._id,
        price: Number(price),
        // price_bucket: priceBucket,
        images: imageUrls,
        category,
        location: {
            street: parsedLocation.street,
            city: parsedLocation.city,
            state: parsedLocation.state,
            country: parsedLocation.country,
            zipCode: parsedLocation.zipCode,
            coordinates: parsedLocation.coordinates.map(Number)
        },
        amenities: parsedAmenities || [],
        maxGuests: maxGuests ? Number(maxGuests) : 1,
        bedrooms: bedrooms ? Number(bedrooms) : 1,
        beds: beds ? Number(beds) : 1,
        bathrooms: bathrooms ? Number(bathrooms) : 1,
        // tags: parsedTags || []
    });

    if (!listing) {
        throw new ApiError(500, "Failed to create listing");
    }

    // Populate host details
    const createdListing = await Listing.findById(listing._id)
        .populate("host", "fullName email avatar")
        .populate("amenities" , "name icon isActive category")
   

    return res.status(201).json(
        new ApiResponse(201, createdListing, "Listing created successfully")
    );
});

// Get listings
const getAllListings = asyncHandler(async (req , res) => {
    const allListing = await Listing.find();
    return res.status(200)
    .json(new ApiResponse(200 , allListing , "All Listing fetched Successfully."));
})

// Update listings
const updateListing = asyncHandler(async (req , res) => {
    const {
        title,
        description,
        price,
        category,
        location,
        amenities,
        maxGuests,
        bedrooms,
        beds,
        bathrooms,
        tags
    } = req.body;
});

export { 
    createListing ,
    getAllListings ,
};