import mongoose from "mongoose";

const amenitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    icon: { type: String }, // Optional for UI
    category : {type : String} ,
    isActive : { type : Boolean , default : true  }
});

export const Amenity = mongoose.model("Amenity", amenitySchema);
