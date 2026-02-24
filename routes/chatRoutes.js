import express from "express";
import { sendMessage, getChatHistory, clearChatHistory } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateChatMessage } from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/send", protect, validateChatMessage, sendMessage);
router.get("/history", protect, getChatHistory);
router.delete("/clear", protect, clearChatHistory);

export default router;
