import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/**
 * Health check endpoint
 * Returns API status and database connection status
 */
router.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  res.json({
    success: true,
    status: "running",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB"
    }
  });
});

/**
 * API documentation endpoint
 */
router.get("/docs", (req, res) => {
  res.json({
    name: "FitAI Backend API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login"
      },
      diet: {
        generate: "POST /api/diet/generate (protected)"
      },
      chat: {
        send: "POST /api/chat/send (protected)"
      },
      health: {
        status: "GET /api/health",
        docs: "GET /api/docs"
      }
    }
  });
});

export default router;
