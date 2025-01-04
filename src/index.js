// src/index.js
import express from "express";
import cors from "cors";
import prisma from "./db.js";
import { router as summaryRouter } from "./routes/summaries.js";
import { router as newsletterRouter } from "./routes/newsletter.js";
import { router as authRouter } from "./routes/auth.js";
import { router as preferencesRouter } from "./routes/preferences.js";
import { router as queueRouter } from "./routes/queue.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();

// Trust proxy - required for fly.io
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/preferences", authMiddleware, preferencesRouter);
app.use("/api/summaries", authMiddleware, summaryRouter);
app.use("/api/newsletter", authMiddleware, newsletterRouter);
app.use("/api/queue", authMiddleware, queueRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
