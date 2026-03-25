import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",   // safer than auto for listings
      folder: "listings"        // keeps assets organized
    });

    // safe cleanup
    fs.existsSync(localFilePath) && fs.unlinkSync(localFilePath);

    return {
      secure_url: response.secure_url,
      public_id: response.public_id
    };
  } catch (error) {
    fs.existsSync(localFilePath) && fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete failed:", error.message);
  }
};

export { uploadCloudinary, deleteFromCloudinary };
