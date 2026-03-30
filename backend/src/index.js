import dotenv from "dotenv";
import {connectDB} from "./db/index.js"
import { app } from "./app.js";
dotenv.config({path : "./env"});

// ConnectDB is async function so it return promise.
connectDB()
.then(() => {
    const port = process.env.PORT || 8000
    app.listen(port , () => {
        console.log("App is Listening at Port : " , port)
    })
})
.catch((error) => {
    console.log("MongoDB Connection Failed :" , error)
})














