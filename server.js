import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Import configurations and utilities
import { connectDatabase } from "./config/database.js";
import { validateEnv } from "./utils/validateEnv.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import dietRoutes from "./routes/dietRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// Import middleware
import { requestLogger } from "./middleware/logger.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

// Validate environment variables
validateEnv();

const app = express();


/* ================= MIDDLEWARE ================= */
// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://swasthai.vercel.app',
        'https://swasthai-frontend.vercel.app',
        /\.vercel\.app$/  // Allow all Vercel preview deployments
      ]
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions)); // frontend ko backend access dene ke liye
app.use(express.json()); // JSON data read karne ke liye
app.use(requestLogger); // Request logging

// Rate limiting for API routes
app.use("/api/", rateLimiter({ maxRequests: 100, windowMs: 15 * 60 * 1000 }));

/* ================= DATABASE ================= */
connectDatabase();

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/diet", dietRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/user", userRoutes);
app.use("/api", healthRoutes);

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("FitAI Backend Running");
});

/* ================= ERROR HANDLING ================= */
app.use(notFound); // 404 handler
app.use(errorHandler); // Global error handler

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
