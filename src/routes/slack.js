import express from "express";
import { WebClient } from "@slack/web-api";

const router = express.Router();

router.post("/oauth/token", async (req, res) => {
  try {
    const { code } = req.body;

    const result = await new WebClient().oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
    });

    // Store tokens in user record
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        slackWorkspace: {
          create: {
            accessToken: result.access_token,
            teamId: result.team.id,
            teamName: result.team.name,
            webhookUrl: result.incoming_webhook?.url,
          },
        },
      },
    });

    res.json({
      success: true,
      workspace: {
        name: result.team.name,
        id: result.team.id,
      },
    });
  } catch (error) {
    console.error("Slack OAuth error:", error);
    res.status(500).json({ error: "Failed to complete Slack integration" });
  }
});

export { router };
