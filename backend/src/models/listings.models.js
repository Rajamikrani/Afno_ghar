import mongoose , {Schema} from "mongoose";

const listingSchema = new Schema(
    {
        title : {
            type : String,
            required : true ,
            trim : true ,
            index : true
        } ,
        description : {
            type : String ,
            required : true 
        } ,
        host : {
            type : mongoose.Schema.Types.ObjectId ,
            ref : "User"
        },
        price: { type: Number, required: true  , default : 500},
        price_bucket: { type: Number }, // 1=Low, 2=Medium, 3=High (used in cosine similarity)
        images : [{
            type : String ,
            required : true
        }],
        category: {
            type: String,
            enum: ["apartment", "villa", "farmhouse", "studio", "shared-room", "treehouse"],
            required: true
        },
        location : {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
            coordinates : {type : [Number] , required : true}
        } ,
  
        amenities: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Amenity"
        }],

        maxGuests: Number,
        bedrooms: Number,
        beds: Number,
        bathrooms: Number,

        tags: [{ type: String }], 

        averageRating: {
            type: Number,
            default: 0
        },

        numberOfRatings: {
            type: Number,
            default: 0
        },
    } ,
  {timestamps : true})

  export const Listing = mongoose.model("Listing" , listingSchema);