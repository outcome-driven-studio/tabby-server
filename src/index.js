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
const port = process.env.PORT || 3000;

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

// Start server
app
  .listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  })
  .on("error", (err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  prisma.$disconnect();
  process.exit(0);
});
