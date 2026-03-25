// test-populate.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Listing } from "./src/models/listings.models.js";
import User from "./src/models/users.models.js";
import Category from "./src/models/categories.model.js";  // make sure this exists
import {Amenity} from "./src/models/aminities.models.js";   // make sure this exists

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB Atlas connected");

    const listings = await Listing.find({})
      .populate("host", "-password -refreshToken") // populate host details
      .populate("category", "name icon")
      .populate("amenities", "name icon category isActive");

    console.log(`Found ${listings.length} listings\n`);

    listings.forEach((listing) => {
      console.log(JSON.stringify(listing, null, 2));
      console.log("-------------------------------------------------\n");
    });

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

main();
