import express from "express";
import { 
  getUserProfile, 
  updateUserProfile, 
  getBMIHistory, 
  addBMIRecord 
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "User routes working!" });
});

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.get("/bmi-history", protect, getBMIHistory);
router.post("/bmi-record", protect, addBMIRecord);

export default router;
