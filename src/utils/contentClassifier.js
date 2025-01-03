// src/utils/contentClassifier.js
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";

let llm;

export async function initializeClassifier() {
  llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.1, // Low temperature for more consistent classification
    maxTokens: 50, // We only need a short response
  });
}

export async function classifyContent({ url, title, content }) {
  if (!llm) {
    await initializeClassifier();
  }

  const template = `Analyze this content and classify it as exactly one of these types: 'article', 'tweet', 'linkedin_post', 'youtube_video', or 'other'.

Consider these characteristics:
- Article: Long-form content with paragraphs, often informative or analytical
- Tweet: Very short content, often with hashtags, @mentions
- LinkedIn Post: Professional content, typically medium length, business-focused
- YouTube Video: Video content with title, description, often has timestamps
- Other: Doesn't clearly match any above types

URL: {url}
Title: {title}
Content Preview: {contentPreview}

Respond with ONLY one of the type strings listed above, nothing else.`;

  const prompt = new PromptTemplate({
    template,
    inputVariables: ["url", "title", "contentPreview"],
  });

  const chain = new LLMChain({
    llm,
    prompt,
  });

  try {
    // Take first 1000 characters of content for classification
    const contentPreview = content.slice(0, 1000);

    const result = await chain.call({
      url,
      title,
      contentPreview,
    });

    // Clean and validate the response
    const classification = result.text.trim().toLowerCase();

    // Log the classification for monitoring
    console.log("Content Classification:", {
      url,
      classification,
      title_length: title?.length,
      content_length: content?.length,
    });

    return classification;
  } catch (error) {
    console.error("Classification error:", error);
    return "other"; // Default to 'other' if classification fails
  }
}
