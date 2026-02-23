import express from "express";
import { sendMessage } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateChatMessage } from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/send", protect, validateChatMessage, sendMessage);

export default router;
