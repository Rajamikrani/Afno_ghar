import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config(
    {
        cloud_name : process.env.CLOUDINARY_CLOUD_NAME ,
        api_key : process.env.CLOUDINARY_API_KEY ,
        api_secret : process.env.CLOUDINARY_API_SECRET
    }
)

const uploadCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log("File is not uploaded.");
            return null;
        }
        // Upload the file on cloudinary.
        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type : 'auto' 
        })
        // file is uploaded on cloudinary
        console.log("File is uploaded on cloudinary : " , response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        // remove the locally saved temporory file as the upload operation got failed.
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId);
};


export {uploadCloudinary , deleteFromCloudinary};