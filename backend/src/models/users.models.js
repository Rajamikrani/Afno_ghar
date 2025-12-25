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
        default : "guest" ,
        required : true
    },
    wishlist : {
        type : mongoose.Schema.Types.ObjectId ,
        ref : "wishlist"
    } ,
    refreshToken : {
        type : String
    } , 
    address : {
        country : {
            type : String ,
            required : true
        },
        state : {
            type : String ,
        } ,
        city : {
            type : String
        }
    },
    languages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Language" }],
    hostListingCount: { type: Number, default: 0 },
    hostAvgRating: { type: Number, default: 0 }
    
} , {timeStamps : true})

// if the users register then it encrypt the password before storing the data into database.
userSchema.pre("save" , async function () {
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password , 10);
})

// it compare the password is correct or not.
// used for login
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password , this.password)
}

// to genereate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id : this._id ,
            email : this.email ,
            username : this.username ,
            fullname : this.fullname ,
            role : this.role 
        } ,
            process.env.ACCESS_TOKEN_SECRET ,
            {
                expiresIn : process.env.ACCESS_TOKEN_EXPIRY
            }
    )
}

// to genereate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id : this._id ,
        } ,
            process.env.REFRESH_TOKEN_SECRET ,
            {
                expiresIn : process.env.REFRESH_TOKEN_EXPIRY
            }
    )
}

const  User = mongoose.model("User" , userSchema);
export default User;

