import express from "express";
import { generateDiet, swapMeal } from "../controllers/dietController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateDietGeneration } from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/generate", protect, validateDietGeneration, generateDiet);
router.post("/swap", protect, swapMeal);

export default router;
