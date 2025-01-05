// src/workers/summaryWorker.js
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import prisma from "../db.js";
import { summaryQueue } from "../utils/queue.js";

let llm = null;

function initializeLLM() {
  if (!llm) {
    llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      maxTokens: 500,
    });
  }
}

// Process jobs using Bull queue
summaryQueue.process(async (job) => {
  const { summaryId } = job.data;

  try {
    console.log(`Processing summary ${summaryId}`);

    // Get the summary data
    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
    });

    if (!summary || summary.status !== "PENDING") {
      throw new Error(`Invalid summary status or not found: ${summaryId}`);
    }

    // Mark as processing
    await prisma.summary.update({
      where: { id: summaryId },
      data: { status: "PROCESSING" },
    });

    // Initialize LLM if needed
    initializeLLM();

    // Generate content
    const [summaryText, keyPoints, tags] = await Promise.all([
      generateSummary(summary.rawContent, summary.type),
      generateKeyPoints(summary.rawContent),
      generateTags(summary.rawContent),
    ]);

    // Update the record
    await prisma.summary.update({
      where: { id: summaryId },
      data: {
        summary: summaryText,
        keyPoints,
        tags,
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    console.log(`Successfully processed summary ${summaryId}`);
    return { summaryId, status: "COMPLETED" };
  } catch (error) {
    console.error(`Error processing summary ${summaryId}:`, error);

    // Mark as failed
    await prisma.summary.update({
      where: { id: summaryId },
      data: {
        status: "FAILED",
        processedAt: new Date(),
        error: error.message,
      },
    });

    throw error; // Rethrow to let Bull handle the failure
  }
});

async function generateSummary(content, type) {
  const templates = {
    article: `Summarize this article in 2-3 informative sentences that capture the main points:
        
        ARTICLE:
        {content}
        
        SUMMARY:`,

    tweet: `Provide a clear, one-sentence summary of this tweet's key message:
        
        TWEET:
        {content}
        
        SUMMARY:`,

    linkedin_post: `Summarize this LinkedIn post in 1-2 professional sentences:
        
        POST:
        {content}
        
        SUMMARY:`,

    youtube_video: `Provide a 2-3 sentence summary of this video's content:
        
        VIDEO CONTENT:
        {content}
        
        SUMMARY:`,
  };

  const template = templates[type] || templates.article;
  const chain = new LLMChain({
    llm,
    prompt: PromptTemplate.fromTemplate(template),
  });

  const result = await chain.call({ content });
  return result.text.trim();
}

async function generateKeyPoints(content) {
  const chain = new LLMChain({
    llm,
    prompt: PromptTemplate.fromTemplate(
      `Extract 3-5 key points from this content, formatted as bullet points:
            
            CONTENT:
            {content}
            
            KEY POINTS:`
    ),
  });

  const result = await chain.call({ content });
  return result.text.trim();
}

async function generateTags(content) {
  const chain = new LLMChain({
    llm,
    prompt: PromptTemplate.fromTemplate(
      `Generate 3-5 relevant tags or topics for this content. 
            Tags should be single words or short phrases, separated by commas.
            
            CONTENT:
            {content}
            
            TAGS:`
    ),
  });

  const result = await chain.call({ content });
  return result.text.split(",").map((tag) => tag.trim());
}

export function startProcessing() {
  // Initialize LLM
  initializeLLM();

  console.log("Starting summary processing worker...");

  // The queue processing logic is already set up via summaryQueue.process()
  return summaryQueue;
}
