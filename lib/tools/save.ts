import { createTool } from "@inngest/agent-kit";
import { success, z } from "zod";

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
