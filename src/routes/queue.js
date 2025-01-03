// src/routes/queue.js
import express from "express";
import { summaryQueue } from "../config/queue.js";

const router = express.Router();

// Get overall queue stats
router.get("/stats", async (req, res) => {
  try {
    const [waiting, active, completed, failed, delayed, paused] =
      await Promise.all([
        summaryQueue.getWaitingCount(),
        summaryQueue.getActiveCount(),
        summaryQueue.getCompletedCount(),
        summaryQueue.getFailedCount(),
        summaryQueue.getDelayedCount(),
        summaryQueue.isPaused(),
      ]);

    return res.json({
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      status: {
        isPaused: paused,
        isActive: active > 0,
      },
      name: summaryQueue.name,
    });
  } catch (error) {
    console.error("Error fetching queue stats:", error);
    return res.status(500).json({
      error: "Failed to fetch queue stats",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get active jobs
router.get("/active", async (req, res) => {
  try {
    const jobs = await summaryQueue.getActive();
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      summaryId: job.data.summaryId,
      progress: job.progress(),
      attempts: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
    }));

    return res.json(formattedJobs);
  } catch (error) {
    console.error("Error fetching active jobs:", error);
    return res.status(500).json({
      error: "Failed to fetch active jobs",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get failed jobs
router.get("/failed", async (req, res) => {
  try {
    const jobs = await summaryQueue.getFailed();
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      summaryId: job.data.summaryId,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    }));

    return res.json(formattedJobs);
  } catch (error) {
    console.error("Error fetching failed jobs:", error);
    return res.status(500).json({
      error: "Failed to fetch failed jobs",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get specific job status
router.get("/job/:id", async (req, res) => {
  try {
    const job = await summaryQueue.getJob(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    return res.json({
      id: job.id,
      summaryId: job.data.summaryId,
      state,
      progress: job.progress(),
      attempts: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return res.status(500).json({
      error: "Failed to fetch job",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Queue management endpoints
router.post("/pause", async (req, res) => {
  try {
    await summaryQueue.pause();
    return res.json({ message: "Queue paused successfully" });
  } catch (error) {
    console.error("Error pausing queue:", error);
    return res.status(500).json({
      error: "Failed to pause queue",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/resume", async (req, res) => {
  try {
    await summaryQueue.resume();
    return res.json({ message: "Queue resumed successfully" });
  } catch (error) {
    console.error("Error resuming queue:", error);
    return res.status(500).json({
      error: "Failed to resume queue",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Retry failed jobs
router.post("/retry-failed", async (req, res) => {
  try {
    const failed = await summaryQueue.getFailed();
    await Promise.all(failed.map((job) => job.retry()));

    return res.json({
      message: `Retrying ${failed.length} failed jobs`,
      count: failed.length,
    });
  } catch (error) {
    console.error("Error retrying failed jobs:", error);
    return res.status(500).json({
      error: "Failed to retry jobs",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Clean completed jobs
router.post("/clean", async (req, res) => {
  try {
    await summaryQueue.clean(24 * 3600 * 1000, "completed"); // Clean completed jobs older than 24 hours
    return res.json({ message: "Cleaned completed jobs" });
  } catch (error) {
    console.error("Error cleaning queue:", error);
    return res.status(500).json({
      error: "Failed to clean queue",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export { router };
