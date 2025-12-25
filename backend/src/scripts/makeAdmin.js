// src/scripts/makeAdmin.js
import mongoose from "mongoose";
import  User  from "../models/users.models.js";
import { DB_NAME } from "../constants.js";
import dotenv from "dotenv";
dotenv.config();

const makeUserAdmin = async (email) => {
    try {
        // Connect to database
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to database");
        
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User with email "${email}" not found`);
            process.exit(1);
        }

        // Check if already admin
        if (user.role === "admin") {
            console.log(`ℹ️  User "${user.fullName}" (${email}) is already an admin`);
            process.exit(0);
        }

        // Make user admin
        user.role = "admin";
        await user.save({ validateBeforeSave: false });

        console.log(`✅ User "${user.fullName}" (${email}) is now an admin!`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.log("❌ Please provide an email address");
    console.log("Usage: node src/scripts/makeAdmin.js your-email@example.com");
    process.exit(1);
}

makeUserAdmin(email);