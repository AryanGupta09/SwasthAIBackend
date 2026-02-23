import mongoose from "mongoose";

const dietSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  bmi: Number,
  goal: String,
  dailyProteinTarget: Number,

  meals: {
    dailyProteinTarget: Number,
    breakfast: [mongoose.Schema.Types.Mixed],  // Can be string or object with meal and protein
    lunch: [mongoose.Schema.Types.Mixed],
    snacks: [mongoose.Schema.Types.Mixed],
    dinner: [mongoose.Schema.Types.Mixed],
  },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Diet", dietSchema);
