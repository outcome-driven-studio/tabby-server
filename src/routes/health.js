import express from "express";
import { redisClient } from "../utils/queue.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Test Redis connection
    const redisStatus = await redisClient
      .ping()
      .then(() => "connected")
      .catch((err) => ({
        status: "error",
        message: err.message,
      }));

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: redisStatus,
      env: {
        node_env: process.env.NODE_ENV,
        redis_url_set: !!process.env.REDIS_URL,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as healthRouter };
