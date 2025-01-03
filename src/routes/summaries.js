// src/routes/summaries.js
import express from "express";
import prisma from "../db.js";
import { startProcessing } from "../workers/summaryWorker.js";
import { classifyContent } from "../utils/contentClassifier.js";
import { summaryQueue } from "../utils/queue.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    // Validate required fields
    const { url, title, content } = req.body;
    if (!url || !title || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "url, title, and content are required",
      });
    }

    console.log("Received content for classification:", { url, title });

    // First, classify the content
    const contentType = await classifyContent({ url, title, content });
    console.log("Content classified as:", contentType);

    // Only process if content type is one we want to handle
    if (
      ["article", "tweet", "linkedin_post", "youtube_video"].includes(
        contentType
      )
    ) {
      const summary = await prisma.tabSummary.create({
        data: {
          url,
          title,
          type: contentType,
          rawContent: content,
          status: "PENDING",
          summary: "", // Initialize with empty string
          keyPoints: "", // Initialize with empty string
          tags: [],
          createdAt: new Date(),
        },
      });

      // Trigger background processing
      await startProcessing(summary.id);

      return res.json({
        id: summary.id,
        status: "PENDING",
        type: contentType,
        message: `Content identified as ${contentType}, processing started`,
      });
    }

    return res.json({
      status: "SKIPPED",
      type: contentType,
      message: "Content type not supported for processing",
    });
  } catch (error) {
    console.error("Error processing content:", error);
    return res.status(500).json({
      error: "Failed to process content",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/status", async (req, res) => {
  try {
    // Get queue status
    const [
      totalCount,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      queueCount,
      activeCount,
    ] = await Promise.all([
      prisma.tabSummary.count(),
      prisma.tabSummary.count({ where: { status: "PENDING" } }),
      prisma.tabSummary.count({ where: { status: "PROCESSING" } }),
      prisma.tabSummary.count({ where: { status: "COMPLETED" } }),
      prisma.tabSummary.count({ where: { status: "FAILED" } }),
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
    const summaries = await prisma.tabSummary.findMany({
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

// Add an endpoint to get a specific summary
router.get("/:id", async (req, res) => {
  try {
    const summary = await prisma.tabSummary.findUnique({
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
