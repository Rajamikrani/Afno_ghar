// scripts/migrateListingStatus.js
import mongoose from "mongoose";
import { Listing } from "../models/listings.models.js";
import dotenv from "dotenv";
dotenv.config();

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const result = await Listing.updateMany(
    { status: { $exists: false } },   // only listings with no status field
    { $set: { status: "approved" } }  // treat them as already approved
  );

  console.log(`Updated ${result.modifiedCount} listings to approved.`);
  await mongoose.disconnect();
};

migrate().catch(console.error);