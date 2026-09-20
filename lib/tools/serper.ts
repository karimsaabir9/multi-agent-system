import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

type Article = {
  title: string;
  link: string;
  summary?: string;
  source: string;
  imageUrl?: string;
};

type SerperResultItem = {
  title: string;
  link: string;
  snippet?: string;
  source: string;
  imageUrl?: string;
};

export const serperSearchTool = createTool({
  name: "serper_search",
  description:
    "Search for latest news articles about ANY topic (AI, sports, politics, technology, etc)",
  parameters: z.object({
    query: z
      .string()
      .describe("Search query - any topic the user wants news about"),
  }),

  handler: async (input, { network, step }) => {
    console.log("NEW SEARCH REQUEST called");
    console.log("Query:", input.query);

    // serper API
    const response = await step?.run("serper_api_call", async () => {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: input.query,
          page: 1,
        }),
      });

      if (!res.ok) {
        throw new Error(`Serper API returned status ${res.status}`);
      }

      const data = await res.json();
      return data;
    });

    // extract the results

    const articles: Article[] = [];

    if (response.knowledgeGraph) {
      articles.push({
        title: response.knowledgeGraph.title,
        link: response.knowledgeGraph.descriptionLink || "",
        summary: response.knowledgeGraph.description,
        source: response.knowledgeGraph.descriptionSource || "Knowledge Graph",
        imageUrl: response.knowledgeGraph.imageUrl,
      });
    }

    // 2. Top Stories (API returns what it wants)
    if (response.topStories) {
      response.topStories.forEach((item: SerperResultItem) => {
        articles.push({
          title: item.title,
          link: item.link,
          summary: item.snippet || `Latest news from ${item.source}`,
          source: item.source,
          imageUrl: item.imageUrl,
        });
      });
    }

    // 3. Organic results (API already respects 'num' parameter)
    if (response.organic) {
      response.organic.forEach((item: SerperResultItem) => {
        articles.push({
          title: item.title,
          link: item.link,
          summary: item.snippet,
          source: item.source,
          imageUrl: item.imageUrl,
        });
      });
    }

    // 4. Fallback to news
    if (articles.length === 0 && response.news) {
      response.news.forEach((item: SerperResultItem) => {
        articles.push({
          title: item.title,
          link: item.link,
          summary: item.snippet,
          source: item.source,
          imageUrl: item.imageUrl,
        });
      });
    }

    // Store in network state
    network.state.data.articles = articles;
    // ✅ : Connect to MongoDB and save to MongoDB!

    // ✅ Save to MongoDB immediately!
    await step?.run('save_to_db', async () => {
        const { getDB } = await import('../db');
        const db = await getDB();
        const runId = network.state.data.runId;
        
        console.log('🔍 [News Scout] Attempting to save to DB...');
        console.log('   runId:', runId);
        console.log('   articles count:', articles.length);
          
        if (runId) {
          const result = await db.collection('results').updateOne(
            { runId, status: 'running' },
            {
              $set: {
                'state.articles': articles,
                'progress.newsScout': 'completed',
                updatedAt: new Date(),
              },
            }
          );
          console.log('✅ [News Scout] DB Update Result:', {
            matched: result.matchedCount,
            modified: result.modifiedCount,
          });
        } else {
          console.error('❌ [News Scout] No runId in state!');
        }
      });

    return { success: true, count: articles.length };
  },
});
