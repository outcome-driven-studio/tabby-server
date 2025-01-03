import prisma from "../db.js";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";

let processingQueue = [];
let isProcessing = false;

export async function startProcessing(summaryId) {
  processingQueue.push(summaryId);
  if (!isProcessing) {
    processNext();
  }
}

async function processNext() {
  if (processingQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const summaryId = processingQueue.shift();

  try {
    // Get the summary data
    const summary = await prisma.tabSummary.findUnique({
      where: { id: summaryId },
    });

    if (!summary || summary.status !== "PENDING") {
      processNext();
      return;
    }

    // Mark as processing
    await prisma.tabSummary.update({
      where: { id: summaryId },
      data: { status: "PROCESSING" },
    });

    // Initialize LangChain
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });

    // Generate summary
    const [summaryText, keyPoints, tags] = await Promise.all([
      generateSummary(llm, summary.rawContent, summary.type),
      generateKeyPoints(llm, summary.rawContent),
      generateTags(llm, summary.rawContent),
    ]);

    // Update the record
    await prisma.tabSummary.update({
      where: { id: summaryId },
      data: {
        summary: summaryText,
        keyPoints,
        tags,
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error processing summary ${summaryId}:`, error);

    // Mark as failed
    await prisma.tabSummary.update({
      where: { id: summaryId },
      data: {
        status: "FAILED",
        processedAt: new Date(),
      },
    });
  }

  // Process next item
  processNext();
}

async function generateSummary(llm, content, type) {
  const template = `Summarize this ${type} content in 2-3 clear and informative sentences:
  
  Content: {content}
  
  Summary:`;

  const chain = new LLMChain({
    llm,
    prompt: new PromptTemplate({
      template,
      inputVariables: ["content"],
    }),
  });

  const result = await chain.call({ content });
  return result.text.trim();
}

async function generateKeyPoints(llm, content) {
  const chain = new LLMChain({
    llm,
    prompt: new PromptTemplate({
      template: "Extract 3-5 key points from this content: {content}",
      inputVariables: ["content"],
    }),
  });

  const result = await chain.call({ content });
  return result.text.trim();
}

async function generateTags(llm, content) {
  const chain = new LLMChain({
    llm,
    prompt: new PromptTemplate({
      template:
        "Generate 3-5 relevant tags for this content, separated by commas: {content}",
      inputVariables: ["content"],
    }),
  });

  const result = await chain.call({ content });
  return result.text.split(",").map((tag) => tag.trim());
}
