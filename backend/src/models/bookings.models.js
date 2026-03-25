    import mongoose , {Schema} from "mongoose";

    const bookingSchema = new Schema({
        listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        listingOwner : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true} ,
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        totalPrice: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled" , "rejected"],
            default: "pending"
        },
        guests: {
            adults: Number,
            children: Number,
            infants: Number
        },
        pricing: {
            nightlyPrice: Number,
            serviceFee: Number,
            cleaningFee: Number,
            totalPrice: Number
    },

    } , {timestamps : true});

    export const Booking = mongoose.model("Booking", bookingSchema);
