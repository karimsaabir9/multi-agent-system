import { createAgent, openai } from "@inngest/agent-kit";
import { serperSearchTool } from "./tools/serper";
import {
  approveContentTool,
  savePostsTool,
  saveSentimentsTool,
} from "./tools/save";
import { generatePosterTool } from "./tools/imageGenerator";
import { checkFactsTool } from "./tools/checkFacts";

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

// Agent 3 : Conetent creator Agent
export const contentCreatorAgent = createAgent({
  name: "content-creator",
  description: "Create social media posts",
  system: ({ network }) => {
    const articles = network?.state.data.articles || [];
    const sentiments = network?.state.data.sentiments || [];

    return `
      You are a social media expert. Create engaging posts from these articles:
      Articles: ${JSON.stringify(articles, null, 2)}
      Sentiments: ${JSON.stringify(sentiments, null, 2)}

      Create 2-3 posts per article:
      - One Twitter post (max 280 chars)
      - One LinkedIn post (professional, ~200 chars)
      - Include relevant hashtags

      MUST use the save_posts tool to store your posts.`;
  },

  tools: [savePostsTool],
  tool_choice: "save_posts",
  // Content Creator
  model: openai({ model: "gpt-5.4" }),
});

// Agent 4 : Poster generator Agent
export const posterGeneratorAgent = createAgent({
  name: "poster-generator",
  description: "Generate social media posters for the social media posts",
  system: ({ network }) => {
    const articles = network?.state.data.articles || [];
    const posters = network?.state.data.posters || [];

    if (posters.length > 0) {
      return `A poster has already been generated for this run. Do NOT call generate_poster again — just confirm it's done.`;
    }

    return `
     You are a creative designer. Generate ONE single poster that represents ALL the content:
      Articles: ${JSON.stringify(articles, null, 2)}

      Use generate_poster tool ONCE to create a single, eye-catching poster.
      Create ONE DALL-E prompt that captures the essence of all the content in a professional, modern design.
      use fewer words in the prompt.
      IMPORTANT: Call generate_poster only ONE time with a comprehensive prompt.
      `;
  },
  tools: [generatePosterTool],
  tool_choice: "generate_poster",
  model: openai({ model: "gpt-5-mini" }),
});

// Agent 5 : Moderator Agent
export const moderatorAgent = createAgent({
  name: "moderator",
  description: "Reviews and approves content",
  system: ({ network }) => {
    const articles = network?.state.data.articles || [];
    const posts = network?.state.data.posts || [];
    const posters = network?.state.data.posters || [];
    const factCheck = network?.state.data.factCheck;

    if (!factCheck) {
      return `
          You are a content moderator. Before approving anything, verify the main
          claim is accurate.

          Articles (${articles.length}): ${JSON.stringify(articles.slice(0, 1), null, 2)}...

          Use the check_facts tool ONCE on the headline/claim of the first article above.
          Do NOT call approve_content yet — only check_facts.
      `;
    }

    return `
          You are a content moderator. Review all content:
          Articles (${articles.length}): ${JSON.stringify(articles.slice(0, 1), null, 2)}...
          Posts (${posts.length}): ${JSON.stringify(posts.slice(0, 1), null, 2)}...
          Posters (${posters.length}): Generated

          Fact-check results for the main claim:
          ${JSON.stringify(factCheck, null, 2)}

          Check:
          1. Do the fact-check sources support the claim? If sourceCount is 0 or the sources
             clearly contradict it, reject.
          2. Are posts appropriate?
          3. Is everything ready to publish?

          MUST use the approve_content tool now to approve or reject the content.
      `;
  },
  tools: [approveContentTool, checkFactsTool],
  tool_choice: "auto",
  model: openai({ model: "gpt-5.4" }),
});
