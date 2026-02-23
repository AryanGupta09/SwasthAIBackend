import User from "../models/User.js";

/* ================= GET USER PROFILE ================= */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
};

/* ================= UPDATE USER PROFILE ================= */
export const updateUserProfile = async (req, res) => {
  try {
    console.log("=== UPDATE PROFILE REQUEST ===");
    console.log("User ID:", req.userId);
    console.log("Request Body:", req.body);

    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Simple update - just copy values
    const { name, height, weight, age, gender, foodPreference, diseases } = req.body;

    if (name) user.name = name;
    if (age) user.age = Number(age);
    if (gender) user.gender = gender;
    if (foodPreference) user.foodPreference = foodPreference;
    
    // Handle height and weight
    if (height) user.height = Number(height);
    if (weight) user.weight = Number(weight);
    
    // Calculate BMI
    if (user.height && user.weight) {
      const h = user.height / 100;
      user.bmi = Number((user.weight / (h * h)).toFixed(1));
    }
    
    // Handle diseases
    if (diseases !== undefined) {
      if (Array.isArray(diseases)) {
        user.diseases = diseases;
      } else if (typeof diseases === 'string') {
        user.diseases = diseases ? diseases.split(',').map(d => d.trim()) : [];
      } else {
        user.diseases = [];
      }
    }

    console.log("Saving user...");
    await user.save();
    console.log("User saved successfully");

    const updatedUser = await User.findById(req.userId).select("-password");
    
    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("=== UPDATE PROFILE ERROR ===");
    console.error("Error:", error);
    
    res.status(500).json({ 
      message: "Failed to update profile",
      error: error.message
    });
  }
};

/* ================= GET BMI HISTORY ================= */
export const getBMIHistory = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      bmiHistory: user.bmiHistory || []
    });
  } catch (error) {
    console.error("Get BMI History Error:", error.message);
    res.status(500).json({ message: "Failed to fetch BMI history", error: error.message });
  }
};

/* ================= ADD BMI RECORD ================= */
export const addBMIRecord = async (req, res) => {
  try {
    const { weight, height, bmi } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.bmiHistory) {
      user.bmiHistory = [];
    }

    user.bmiHistory.push({
      weight: Number(weight),
      height: Number(height),
      bmi: Number(bmi),
      date: new Date()
    });

    // Keep only last 30 records
    if (user.bmiHistory.length > 30) {
      user.bmiHistory = user.bmiHistory.slice(-30);
    }

    user.weight = Number(weight);
    user.height = Number(height);
    user.bmi = Number(bmi);

    await user.save();

    res.json({
      message: "BMI record added successfully",
      bmiHistory: user.bmiHistory
    });
  } catch (error) {
    console.error("Add BMI Record Error:", error.message);
    res.status(500).json({ message: "Failed to add BMI record", error: error.message });
  }
};
