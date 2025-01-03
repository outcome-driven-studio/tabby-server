import express from "express";
import { generateAndSendNewsletter } from "../workers/newsletter.js";

const router = express.Router();

router.post("/trigger", async (req, res) => {
  try {
    await generateAndSendNewsletter();
    res.json({ message: "Newsletter generation triggered" });
  } catch (error) {
    console.error("Error triggering newsletter:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router };
