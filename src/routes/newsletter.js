// src/routes/newsletter.js
import express from "express";
import { generateAndSendNewsletter } from "../workers/newsletter.js";
import { formatNewsletter } from "../workers/newsletter.js";
import prisma from "../db.js";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await generateAndSendNewsletter(userId);
    return res.json(result);
  } catch (error) {
    console.error("Error generating newsletter:", error);
    return res.status(500).json({
      error: "Failed to generate newsletter",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/preview", async (req, res) => {
  try {
    const summaries = await prisma.summary.findMany({
      where: {
        status: "COMPLETED",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    if (summaries.length === 0) {
      return res.json({
        ready: false,
        message: "No completed summaries available",
      });
    }

    const newsletter = formatNewsletter(summaries);
    return res.json({
      ready: true,
      count: summaries.length,
      preview: {
        slack: newsletter.slack,
        email: newsletter.email,
      },
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    return res.status(500).json({
      error: "Failed to generate preview",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export { router };
