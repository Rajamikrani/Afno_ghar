
// get wishlist
import { Wishlist } from "../models/wishlists.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Toggle Wishlist Controller
// This function adds or removes a listing from the user's wishlist
const toggleWishlist = asyncHandler(async (req, res) => {

    // STEP 1: Ensure the user is authenticated
    // `req.user` is populated by the authentication middleware
    const userId = req.user._id;

    // STEP 2: Get the listing ID from the request parameters
    const { listingId } = req.params;

    // STEP 3: Check if the user already has a wishlist
    let wishlist = await Wishlist.findOne({ user: userId });

    // STEP 4: If wishlist does NOT exist, create a new one
    // and add the listing to it
    if (!wishlist) {
        wishlist = await Wishlist.create({
            user: userId,
            listings: [listingId], // initialize wishlist with this listing
        });

        return res.status(200).json(
            new ApiResponse(200, wishlist, "Added to Wishlist")
        );
    }

    // STEP 5: Check whether the listing is already in the wishlist
    const isAlreadyAdded = wishlist.listings.includes(listingId);

    // STEP 6: Toggle logic
    // If listing exists → remove it
    // If listing does not exist → add it
    if (isAlreadyAdded) {
        wishlist.listings.pull(listingId); // remove listing
    } else {
        wishlist.listings.push(listingId); // add listing
    }

    // STEP 7: Save the updated wishlist
    await wishlist.save();

    // STEP 8: Send response with appropriate message
    return res.status(200).json(
        new ApiResponse(
            200,
            wishlist,
            isAlreadyAdded ? "Removed from Wishlist" : "Added to Wishlist"
        )
    );
});

const getMyWishList = asyncHandler(async (req , res) => {
    const wishlist = await Wishlist.findOne({user : req.user._id})
    .populate("listings");
    if (!wishlist) {
        return res.status(200)
        .json(new ApiResponse(200 , {} , "WishList is Empty"))
    }
    return res.status(200)
    .json(new ApiResponse(200 , wishlist , "WishList fetched Successfully."))
})


export {
    toggleWishlist ,
    getMyWishList
}