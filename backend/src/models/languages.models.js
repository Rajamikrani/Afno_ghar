const languageSchema = new mongoose.Schema({
  name: { type: String, unique: true }
});

export default mongoose.model("Language", languageSchema);
