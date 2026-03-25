// models/category.model.js
import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    icon: {
       type : String ,
       required : true
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
 const Category = mongoose.model("Category", categorySchema);

 export default Category;
