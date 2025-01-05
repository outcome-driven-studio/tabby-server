import { WebClient } from "@slack/web-api";
import prisma from "../db.js";

export class SlackWorker {
  constructor() {
    this.clients = new Map();
  }

  async getClientForUser(userId) {
    if (!this.clients.has(userId)) {
      const workspace = await prisma.slackWorkspace.findUnique({
        where: { userId },
      });

      if (!workspace) {
        throw new Error("No Slack workspace connected");
      }

      this.clients.set(userId, new WebClient(workspace.accessToken));
    }

    return this.clients.get(userId);
  }

  async sendNewsletter(userId, newsletter) {
    try {
      const client = await this.getClientForUser(userId);
      const workspace = await prisma.slackWorkspace.findUnique({
        where: { userId },
      });

      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📚 Your Tab Summary Newsletter",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Here's your summary of ${newsletter.summaries.length} tabs:`,
          },
        },
      ];

      // Add each summary as a section
      newsletter.summaries.forEach((summary) => {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*<${summary.url}|${summary.title}>*\n${summary.content}`,
          },
        });
        blocks.push({ type: "divider" });
      });

      await client.chat.postMessage({
        channel: workspace.defaultChannel || "#general",
        text: `Your Tab Summary Newsletter (${newsletter.summaries.length} tabs)`,
        blocks,
      });

      return true;
    } catch (error) {
      console.error(
        `Failed to send Slack newsletter for user ${userId}:`,
        error
      );
      throw error;
    }
  }
}

export const slackWorker = new SlackWorker();
