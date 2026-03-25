/**
 * Calculate cosine similarity between two vectors
 */
export const calculateCosineSimilarity = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecB[i] * vecB[i];
        magnitudeB += vecA[i] * vecA[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
};


/**
 * Haversine distance between two coordinates (km)
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => deg * (Math.PI / 180);

    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};


/**
 * Convert listing to feature vector
 */
export const listingToVector = (
    listing,
    allAmenities,
    referenceLocation = null,
    referencePrice = null
) => {
    const vector = [];

    /* 
        PRICE SIMILARITY FEATURE
       (Relative difference instead of raw value)
     */
    if (referencePrice !== null) {
        const diff = Math.abs((listing.price || 0) - referencePrice);
        const maxPrice = Math.max(referencePrice, listing.price || 1);
        const priceSimilarity = 1 - diff / maxPrice;
        vector.push(priceSimilarity);
    } else {
        vector.push(Math.min((listing.price || 0) / 1000, 1));
    }

   
        // CATEGORY ONE HOT

    const categoryName =
        listing.category?.name ||
        listing.category ||
        "";

    const categoryList = [
        "apartment",
        "villa",
        "farmhouse",
        "studio",
        "shared-room",
        "treehouse" , 
        "cottage"
    ];

    categoryList.forEach(cat => {
        vector.push(
            categoryName.toLowerCase() === cat.toLowerCase() ? 1 : 0
        );
    });

    
     // CAPACITY FEATURES
  
    vector.push(Math.min((listing.maxGuests || 0) / 10, 1));
    vector.push(Math.min((listing.bedrooms || 0) / 5, 1));
    vector.push(Math.min((listing.beds || 0) / 8, 1));
    vector.push(Math.min((listing.bathrooms || 0) / 4, 1));

  
    // LOCATION SIMILARITY

    if (
        referenceLocation &&
        listing.location?.coordinates
    ) {
        const distance = haversineDistance(
            referenceLocation.lat,
            referenceLocation.lng,
            listing.location.coordinates.lat,
            listing.location.coordinates.lng
        );

        // Convert distance into similarity (closer = higher score)
        const locationSimilarity = 1 / (1 + distance); // smooth decay
        vector.push(locationSimilarity);
    } else {
        vector.push(0);
    }

    /* =========================
       5️ AMENITIES ONE HOT
    ========================== */
    const listingAmenityIds = (listing.amenities || []).map(a =>
        a._id ? a._id.toString() : a.toString()
    );

    allAmenities.forEach(amenity => {
        vector.push(
            listingAmenityIds.includes(amenity._id.toString()) ? 1 : 0
        );
    });

    /* =========================
       6️ RATING
    ========================== */
    vector.push((listing.averageRating || 0) / 5);

    /* =========================
       7️ GUEST FAVOURITE
    ========================== */
    vector.push(listing.isGuestFavourite ? 1 : 0);

    return vector;
};


/**
 * Find similar listings with price & location awareness
 */
export const findSimilarListings = (
    targetListing,
    allListings,
    allAmenities,
    topN = 5
) => {
    const referenceLocation =
        targetListing.location?.coordinates || null;

    const referencePrice = targetListing.price || 0;

    const targetVector = listingToVector(
        targetListing,
        allAmenities,
        referenceLocation,
        referencePrice
    );

    const results = allListings
        .filter(l => l._id.toString() !== targetListing._id.toString())
        .map(listing => {
            const vector = listingToVector(
                listing,
                allAmenities,
                referenceLocation,
                referencePrice
            );

            const similarity = calculateCosineSimilarity(
                targetVector,
                vector
            );  

            return {
                listing,
                similarityScore: similarity
            };
        })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, topN);

    return results;
};