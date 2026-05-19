import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  height: Number,
  weight: Number,
  age: Number,
  gender: String,

  foodPreference: String,
  diseases: [String],
  bmi: Number,

  // BMI History
  bmiHistory: [{
    weight: Number,
    height: Number,
    bmi: Number,
    date: { type: Date, default: Date.now }
  }],

  // Latest Diet Plan
  latestDietPlan: {
    meals: {
      dailyProteinTarget: Number,
      breakfast: [mongoose.Schema.Types.Mixed],
      lunch: [mongoose.Schema.Types.Mixed],
      snacks: [mongoose.Schema.Types.Mixed],
      dinner: [mongoose.Schema.Types.Mixed]
    },
    bmi: Number,
    goal: String,
    dailyProteinTarget: Number,
    createdAt: { type: Date, default: Date.now }
  },

  // Profile Picture (URL or base64)
  profilePicture: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save - Fixed version
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (typeof next === 'function') {
    next();
  }
});

export default mongoose.model("User", userSchema);
