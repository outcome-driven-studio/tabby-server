import express from "express";
import { google } from "googleapis";
import prisma from "../db.js";

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    let user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        picture: data.picture,
        lastLogin: new Date(),
      },
      create: {
        email: data.email,
        name: data.name,
        picture: data.picture,
        preferences: {
          create: {
            contentTypes: [],
            automationEnabled: false,
            automationFrequency: 1,
          },
        },
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
});

export { router };
