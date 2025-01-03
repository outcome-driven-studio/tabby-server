// src/workers/newsletter.js
import sgMail from "@sendgrid/mail";
import prisma from "../db.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function generateAndSendNewsletter() {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const summaries = await prisma.$transaction(async (tx) => {
      const results = await tx.tabSummary.findMany({
        where: {
          createdAt: {
            gte: weekAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });
      return results;
    });

    if (summaries.length === 0) {
      console.log("No summaries to send");
      return;
    }

    const newsletter = formatNewsletter(summaries);
    await Promise.all([
      sendToSlack(newsletter.slack),
      sendEmail(newsletter.email),
    ]);
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

  let slackContent = `🐱 *Weekly Tab Digest*\n_${new Date().toLocaleDateString()}_\n\n`;
  let emailContent = `<h1>Weekly Tab Digest</h1><p>${new Date().toLocaleDateString()}</p>`;

  for (const [type, items] of Object.entries(grouped)) {
    // Slack formatting
    slackContent += `*${type.toUpperCase()}*\n\n`;
    items.forEach((item) => {
      slackContent += `• <${item.url}|${item.title}>\n`;
      slackContent += `${item.summary}\n\n`;
      slackContent += `Key Points:\n${item.keyPoints}\n\n`;
      slackContent += `Tags: ${item.tags
        .map((tag) => "#" + tag)
        .join(" ")}\n\n`;
    });

    // Email formatting
    emailContent += `<h2>${type.toUpperCase()}</h2>`;
    items.forEach((item) => {
      emailContent += `
        <div style="margin-bottom: 20px;">
          <h3><a href="${item.url}">${item.title}</a></h3>
          <p>${item.summary}</p>
          <p><strong>Key Points:</strong><br>${item.keyPoints}</p>
          <p><strong>Tags:</strong> ${item.tags
            .map((tag) => `#${tag}`)
            .join(" ")}</p>
        </div>
      `;
    });
  }

  return {
    slack: slackContent,
    email: emailContent,
  };
}

async function sendToSlack(content) {
  try {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      throw new Error("Failed to send to Slack");
    }
  } catch (error) {
    console.error("Error sending to Slack:", error);
    throw error;
  }
}

async function sendEmail(content) {
  try {
    await sgMail.send({
      to: process.env.NOTIFICATION_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: `Weekly Tab Digest - ${new Date().toLocaleDateString()}`,
      html: content,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
