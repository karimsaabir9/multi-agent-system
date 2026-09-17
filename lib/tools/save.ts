import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const saveSentimentsTool = createTool({
  name: "save_sentiments",
  description: "Save the sentiments analysis of the article to the database",
  parameters: z.object({
    sentiments: z.array(
      z.object({
        sentiment: z.enum(["positive", "negative", "neutral"]),
        score: z.number(),
        reasoning: z.string(),
      }),
    ),
  }),

  handler: async (input, { network, step }) => {
    // store the sentiments in the network state

    network.state.data.sentiments = input.sentiments;

    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;

      if (runId) {
        const result = await db.collection("result").updateOne(
          {
            runId,
            status: "running",
          },
          {
            $set: {
              "state.sentiments": input.sentiments,
              "progress.sentimentAnalyzer": "completed",
              updatedAt: new Date(),
            },
          },
        );
      } else {
        console.error("No runId found");
      }
    });

    return { success: true, count: input.sentiments.length };
  },
});

export const savePostsTool = createTool({
  name: "save_posts",
  description: "Save the social media posts to the database",
  parameters: z.object({
      posts: z.array(
          z.object({
              type: z.enum(["twitter", "linkedin"]),
              content: z.string(),
              hashtags: z.array(z.string()),
          })
      )
  }),
  handler: async (input, { network, step }) => {
      // store the posts in the network state
      network.state.data.posts = input.posts;

      await step?.run('save_to_db', async () => {
          const { getDB } = await import('../db');

          const db = await getDB();

          const runId = network.state.data.runId;

          if (runId) {
              const result = await db.collection('results').updateOne(
                  { runId, status: 'running' },
                  {
                      $set: {
                          'state.posts': input.posts,
                          'progress.contentCreator': 'completed',
                          updatedAt: new Date()
                      }
                  }
              )
          } else {
              console.error('No runId found');
          }
      })

      return { success: true, count: input.posts.length };
  }
})
