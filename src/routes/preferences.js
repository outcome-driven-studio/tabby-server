import express from "express";
import prisma from "../db.js";

const router = express.Router();

router.patch("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { contentTypes, automation = { enabled: false, frequency: 1 } } =
      req.body;

    // Validate required fields
    if (!contentTypes || !Array.isArray(contentTypes)) {
      return res.status(400).json({
        error: "Invalid request",
        details: "contentTypes must be an array",
      });
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        contentTypes,
        automationEnabled: automation?.enabled ?? false,
        automationFrequency: automation?.frequency ?? 1,
      },
      create: {
        userId,
        contentTypes,
        automationEnabled: automation?.enabled ?? false,
        automationFrequency: automation?.frequency ?? 1,
      },
    });

    res.json({ success: true, preferences });
  } catch (error) {
    console.error("Preferences error:", error);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

export { router };
