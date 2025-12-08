import mongoose , {Schema} from "mongoose";
import bcrypt, { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    username : {
        type : String ,
        unique : true ,
        required : true ,
        lowercase : true ,
        trim : true ,
        index : true
    } ,
     email : {
        type : String ,
        unique : true ,
        required : true ,
        lowercase : true ,
        trim : true
    } ,
    password : {
        type : String ,
        required : true
    },
     fullname : {
        type : String ,
        required : true ,
        index : true ,
        trim : true
    } ,
    avatar : {
        type : String , // cloudinary
        required : true 
    } ,
    bio : {
        type : String ,
        maxLength : 1000
    } ,
    role : {
        type : String ,
        enum : ["guest" , "host" , "admin"] ,
        default : "guest"
    },
    wishlist : {
        type : mongoose.Schema.Types.ObjectId ,
        ref : "wishlist"
    } ,
    refreshToken : {
        type : String
    } , 
    hostListingCount: { type: Number, default: 0 },
    hostAvgRating: { type: Number, default: 0 }
    
} , {timeStamps : true})

// if the users register then it encrypt the password before storing the data into database.
userSchema.pre("save" , async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password , 10);
    next();
})

// it compare the password is correct or not.
// used for login
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password , this.password)
}

// to genereate Access Token
userSchema.methods.generateAccessToken = function () {
    jwt.sign(
        {
            _id : this._id ,
            email : this.email ,
            username : this.username ,
            fullname : this.fullname
        } ,
            process.env.ACCESS_TOKEN_SECRET ,
            {
                expiresIn : ACCESS_TOKEN_EXPIRY
            }
    )
}

userSchema.methods.generateRefreshToken = function () {
    jwt.sign(
        {
            _id : this._id 
        } ,
            process.env.REFRESH_TOKEN_SECRET ,
            {
                expiresIn : REFRESH_TOKEN_EXPIRY
            }
    )
}

export default User = mongoose.model("User" , userSchema);
