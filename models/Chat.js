import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  role: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Chat", chatSchema);
