/**
 * Input validation middleware
 * Validates and sanitizes incoming request data
 */

export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ 
      message: "All fields are required",
      required: ["name", "email", "password"]
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  // Password strength
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: "Email and password are required" 
    });
  }

  next();
};

export const validateDietGeneration = (req, res, next) => {
  const { bmi, foodPreference } = req.body;

  if (!bmi || !foodPreference) {
    return res.status(400).json({ 
      message: "BMI and food preference are required" 
    });
  }

  if (typeof bmi !== "number" || bmi < 10 || bmi > 60) {
    return res.status(400).json({ 
      message: "Invalid BMI value. Must be between 10 and 60" 
    });
  }

  next();
};

export const validateChatMessage = (req, res, next) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ 
      message: "Message is required and must be a non-empty string" 
    });
  }

  if (message.length > 1000) {
    return res.status(400).json({ 
      message: "Message too long. Maximum 1000 characters allowed" 
    });
  }

  next();
};
