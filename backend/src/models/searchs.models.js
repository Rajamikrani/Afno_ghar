import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    searchText: String,
    filters: Object,
} , {timestamps : true});

 export const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema);
