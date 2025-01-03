// src/index.js
import express from "express";
import cors from "cors";
import prisma from "./db.js";
import { router as summaryRouter } from "./routes/summaries.js";
import { router as newsletterRouter } from "./routes/newsletter.js";

const app = express();

// Trust proxy - required for fly.io
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/summaries", summaryRouter);
app.use("/api/newsletter", newsletterRouter);

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
