// src/routes/summaries.js
import express from "express";
import prisma from "../db.js";
import { classifyContent } from "../utils/contentClassifier.js";
import { summaryQueue } from "../utils/queue.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { content, metadata, userId } = req.body;

    // Create pending summary
    const summary = await prisma.summary.create({
      data: {
        rawContent: content,
        metadata,
        status: "PENDING",
        userId,
      },
    });

    // Add to processing queue
    await summaryQueue.add(
      { summaryId: summary.id },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );

    res.json(summary);
  } catch (error) {
    console.error("Error creating summary:", error);
    res.status(500).json({ error: "Failed to create summary" });
  }
});

router.get("/status", async (req, res) => {
  try {
    const [
      totalCount,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      queueCount,
      activeCount,
    ] = await Promise.all([
      prisma.summary.count(),
      prisma.summary.count({ where: { status: "PENDING" } }),
      prisma.summary.count({ where: { status: "PROCESSING" } }),
      prisma.summary.count({ where: { status: "COMPLETED" } }),
      prisma.summary.count({ where: { status: "FAILED" } }),
      summaryQueue.getWaitingCount(),
      summaryQueue.getActiveCount(),
    ]);

    const counts = {
      total: totalCount,
      pending: pendingCount,
      processing: processingCount,
      completed: completedCount,
      failed: failedCount,
      queued: queueCount,
      active: activeCount,
    };

    const ready =
      pendingCount === 0 &&
      processingCount === 0 &&
      queueCount === 0 &&
      activeCount === 0 &&
      totalCount > 0;

    let message = "No summaries to process";
    if (totalCount > 0) {
      if (!ready) {
        const inProgress = processingCount + activeCount;
        const waiting = pendingCount + queueCount;
        message = `Processing summaries (${completedCount} completed, ${inProgress} in progress, ${waiting} waiting)`;
      } else {
        message = "All summaries are ready";
      }
    }

    return res.json({
      ready,
      counts,
      message,
    });
  } catch (error) {
    console.error("Error checking status:", error);
    return res.status(500).json({
      error: "Failed to check status",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const summaries = await prisma.summary.findMany({
      where: {
        status: "COMPLETED",
      },
      select: {
        id: true,
        url: true,
        title: true,
        type: true,
        summary: true,
        keyPoints: true,
        tags: true,
        createdAt: true,
        processedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(summaries);
  } catch (error) {
    console.error("Error fetching summaries:", error);
    return res.status(500).json({
      error: "Failed to fetch summaries",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/api/summaries", async (req, res) => {
  try {
    const { url, title, type, content, metadata } = req.body;

    // Validate Google token from header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No auth token provided" });
    }

    // Create summary in database
    const summary = await prisma.summary.create({
      data: {
        url,
        title,
        type,
        content,
        metadata,
        status: "COMPLETED",
      },
    });

    res.json(summary);
  } catch (error) {
    console.error("Error creating summary:", error);
    res.status(500).json({ error: "Failed to create summary" });
  }
});

router.get("/api/summaries/:id", async (req, res) => {
  try {
    const summary = await prisma.summary.findUnique({
      where: { id: req.params.id },
    });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Add an endpoint to get a specific summary
router.get("/:id", async (req, res) => {
  try {
    const summary = await prisma.summary.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    return res.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return res.status(500).json({
      error: "Failed to fetch summary",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export { router };
