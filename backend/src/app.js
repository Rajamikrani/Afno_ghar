import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

app.use(cors({
    credentials : true ,
    origin : process.env.CORS_ORIGIN
}))
app.use((req, res, next) => {
  console.log("📥 REQUEST:", req.method, req.url);
  next();
});
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true , limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


// import routes
import userRouter from "./routes/users.routes.js";
import listingRouter from "./routes/listings.routes.js";
import amenityRouter from "./routes/aminities.routes.js";
import wishlistRouter from "./routes/wishlists.routes.js";
import bookingRouter from "./routes/bookings.routes.js";
import reviewRouter from "./routes/reviews.routes.js";
import categoryRouter from "./routes/categories.routes.js";
// route declarations
// http://localhost:8000/api/v1/users/register
app.use("/api/v1/users" , userRouter);
app.use("/api/v1/listings" , listingRouter);
app.use("/api/v1/amenities" , amenityRouter);
app.use("/api/v1/wishlist" , wishlistRouter);
app.use("/api/v1/bookings" , bookingRouter);
app.use("/api/v1/reviews" , reviewRouter);
app.use("/api/v1/categories" , categoryRouter)

export {app}