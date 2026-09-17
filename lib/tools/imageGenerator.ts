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
    // The network can re-route to this agent after a poster already exists
    // (observed in practice: the router's decision can be based on state
    // that hasn't settled yet). In-memory network.state isn't reliable across
    // Inngest replay boundaries, so check the DB — the only durable source —
    // wrapped in step.run so the check itself is memoized consistently.
    const runId = network?.state.data.runId;
    const existingPoster = await step?.run("check-existing-poster", async () => {
      if (!runId) return null;
      const { getDB } = await import("../db");
      const db = await getDB();
      const existing = await db.collection("results").findOne({ runId });
      return existing?.state?.posters?.[0] ?? null;
    });

    if (existingPoster) {
      if (network) {
        network.state.data.posters = [existingPoster];
      }
      return { success: true, imageUrl: existingPoster.url, prompt: existingPoster.prompt };
    }

    // Generate the poster using GPT-Image-2
    const imageUrl = await step?.run("image-api-call", async () => {
      const generate = async (prompt: string) => {
        const response = await openai.images.generate({
          model: "gpt-image-2",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "low",
        });

        return response.data?.[0]?.url;
      };

      try {
        return await generate(input.prompt);
      } catch (error) {
        // OpenAI's safety system can reject prompts derived from news content
        // (violence, real people, etc). That rejection is permanent, so retrying
        // the same prompt would just fail again — fall back to a generic, safe
        // prompt instead.
        console.error(
          "Poster prompt rejected, retrying with a generic fallback prompt:",
          error,
        );
        return await generate(
          "Abstract modern news and current-events themed poster, bold typography, professional color palette, no real people, no text",
        );
      }
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
          { runId },
          {
            $set: {
              "state.posters": network.state.data.posters,
              "progress.posterGenerator": "completed",
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      } else {
        console.error("❌ [Poster Designer] No runId in state!");
      }
    });
    return { success: true, imageUrl, prompt: input.prompt };
  },
});
