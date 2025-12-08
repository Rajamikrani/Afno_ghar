import mongoose , {Schema} from "mongoose";

const bookingSchema = new Schema({
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending"
    },
} , {timestamps : true});

export const Booking = mongoose.model("Booking", bookingSchema);
