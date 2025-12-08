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















/*
import express from 'express';
const app = express();

( async() => {
    const port = process.env.PORT || 8000;
    try {
        console.log("MONGODB URI --->", process.env.MONGODB_URI);
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error" , (error) => {
            console.log(error)
            throw error
        })
        app.listen(port, () => {
            console.log(`App is Listening at Port : ${port}`)
        })
    }catch(error) {
        console.log("Error : " , error)
        process.exit()
    }
})

*/
