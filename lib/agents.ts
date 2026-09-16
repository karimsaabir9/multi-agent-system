import { createAgent, openai } from "@inngest/agent-kit";
import { serperSearchTool } from "./tools/serper";
import { saveSentimentsTool } from "./tools/save";

// Agent 1 : News Scout Agent
export const newsScoutAgent = createAgent({
  name: "News Scout",
  description:
    "A news scout agent that can search the web for the latest news and articles.",
  system: `
    You are an expert news researcher. Your job is to:
    1. Search for the latest news using the search_news tool based on the user's query
    2. The query can be about ANY topic: AI, sports, politics, technology, entertainment, etc
    3. Use the exact topic the user requested
    4. Return relevant and current news articles
    ALWAYS use the search_news tool with the user's query.    
    `,
  tools: [serperSearchTool],
  model: openai({ model: "gpt-5-mini" }),
});

// Agent 2 : Sentiment Analyzer Agent
export const sentimentAnalyzerAgent = createAgent({
  name: "sentiment-analyzer",
  description: "Analyzes sentiment of articles",
  system: ({ network }) => {
    const articles = network?.state.data.articles || [];

    return `
        
        You are a sentiment analysis expert. Analyze these articles:
        ${JSON.stringify(articles, null, 2)}

        For each article, determine:
        1. Sentiment (positive, negative, neutral)
        2. Score (0-1)
        3. Brief reasoning

        MUST use the save_sentiments tool to store your analysis.
        `;
  },
  tools: [saveSentimentsTool],
  tool_choice: "save_sentiments",
  model: openai({ model: "gpt-5-mini" }),
});
