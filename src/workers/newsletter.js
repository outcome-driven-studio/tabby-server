import sgMail from "@sendgrid/mail";
import prisma from "../db.js";
import { slackWorker } from "./slackWorker.js";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function generateAndSendNewsletter(userId) {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const summaries = await prisma.$transaction(async (tx) => {
      return tx.summary.findMany({
        where: {
          userId,
          status: "COMPLETED",
          createdAt: {
            gte: weekAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });
    });

    if (summaries.length === 0) {
      return { success: false, message: "No summaries to send" };
    }

    const newsletter = formatNewsletter(summaries);

    // Send to Slack if workspace is connected
    const workspace = await prisma.slackWorkspace.findUnique({
      where: { userId },
    });

    if (workspace) {
      try {
        await slackWorker.sendNewsletter(newsletter.slack);
        console.log("Slack digest sent successfully");
      } catch (error) {
        console.error("Error sending Slack digest:", error);
      }
    }

    // Send email if configured
    if (process.env.SENDGRID_API_KEY && process.env.NOTIFICATION_EMAIL) {
      try {
        await sendEmail(newsletter.email);
        console.log("Email sent successfully");
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }

    return { success: true, message: "Newsletter sent successfully" };
  } catch (error) {
    console.error("Error generating newsletter:", error);
    throw error;
  }
}

function formatNewsletter(summaries) {
  const grouped = summaries.reduce((acc, item) => {
    acc[item.type] = acc[item.type] || [];
    acc[item.type].push(item);
    return acc;
  }, {});

  return {
    slack: formatSlackContent(grouped),
    email: formatEmailContent(grouped),
  };
}

function formatSlackContent(grouped) {
  let content = `🐱 *Weekly Tab Digest*\n_${new Date().toLocaleDateString()}_\n\n`;

  for (const [type, items] of Object.entries(grouped)) {
    content += `*${type.toUpperCase()}*\n\n`;
    items.forEach((item) => {
      content += `• <${item.url}|${item.title}>\n`;
      if (item.summary) content += `${item.summary}\n\n`;
      if (item.keyPoints) content += `Key Points:\n${item.keyPoints}\n\n`;
      if (item.tags?.length) {
        content += `Tags: ${item.tags.map((tag) => "#" + tag).join(" ")}\n\n`;
      }
    });
  }

  return content;
}

function formatEmailContent(grouped) {
  let content = `<h1>Weekly Tab Digest</h1><p>${new Date().toLocaleDateString()}</p>`;

  for (const [type, items] of Object.entries(grouped)) {
    content += `<h2>${type.toUpperCase()}</h2>`;
    items.forEach((item) => {
      content += `
        <div style="margin-bottom: 20px;">
          <h3><a href="${item.url}">${item.title}</a></h3>
          ${item.summary ? `<p>${item.summary}</p>` : ""}
          ${
            item.keyPoints
              ? `<p><strong>Key Points:</strong><br>${item.keyPoints}</p>`
              : ""
          }
          ${
            item.tags?.length
              ? `<p><strong>Tags:</strong> ${item.tags
                  .map((tag) => `#${tag}`)
                  .join(" ")}</p>`
              : ""
          }
        </div>
      `;
    });
  }

  return content;
}

async function sendEmail(content) {
  const msg = {
    to: process.env.NOTIFICATION_EMAIL,
    from: {
      email: process.env.FROM_EMAIL,
      name: "Tabby Digest",
    },
    subject: `Weekly Tab Digest - ${new Date().toLocaleDateString()}`,
    html: content,
  };

  const response = await sgMail.send(msg);
  if (response[0].statusCode !== 202) {
    throw new Error(`SendGrid returned status ${response[0].statusCode}`);
  }
}

export { generateAndSendNewsletter, formatNewsletter };
export { formatSlackContent, formatEmailContent };
