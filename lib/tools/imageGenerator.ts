import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generatePosterTool = createTool({
  name: "generate_poster",
  description:
    "Generate a single, eye-catching poster for the social media posts",
  parameters: z.object({
    prompt: z
      .string()
      .describe("A detailed description of the poster to generate"),
  }),
  handler: async (input, { network, step }) => {
    // Generate the poster using GPT-Image-2
    const imageUrl = await step?.run("image-api-call", async () => {
      const response = await openai.images.generate({
        model: "gpt-image-2",
        prompt: input.prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });

      return response.data?.[0]?.url;
    });

    if (!imageUrl) {
      console.error("Failed to generate poster");
      throw new Error("Failed to generate poster");
    }

    const poster = {
      url: imageUrl,
      prompt: input.prompt,
    };

    // store into the network state
    const existingPosters = network?.state.data.posters || [];

    network.state.data.posters = [...existingPosters, poster];

    // save to the database
    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");

      const db = await getDB();

      const runId = network.state.data.runId;

      if (runId) {
        const result = await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.posters": network.state.data.posters,
              "progress.posterGenerator": "completed",
              updatedAt: new Date(),
            },
          },
        );
      } else {
        console.error("❌ [Poster Designer] No runId in state!");
      }
    });
    return { success: true, imageUrl, prompt: input.prompt };
  },
});
