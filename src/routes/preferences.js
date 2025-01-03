const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.patch("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { contentTypes, automation } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        contentTypes,
        automationEnabled: automation.enabled,
        automationFrequency: automation.frequency,
      },
      create: {
        userId,
        contentTypes,
        automationEnabled: automation.enabled,
        automationFrequency: automation.frequency,
      },
    });

    res.json({ success: true, preferences });
  } catch (error) {
    console.error("Preferences error:", error);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

module.exports = router;
