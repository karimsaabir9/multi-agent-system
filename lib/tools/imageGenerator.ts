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

    // Hard cost cap: defense in depth in case this agent ever gets
    // re-invoked unexpectedly — stop paying for image generation after a
    // couple of tries and let the workflow move on with a placeholder
    // instead of looping indefinitely.
    const attempts = await step?.run("count-poster-attempt", async () => {
      if (!runId) return 1;
      const { getDB } = await import("../db");
      const db = await getDB();
      const result = await db.collection("results").findOneAndUpdate(
        { runId },
        { $inc: { posterAttempts: 1 } },
        { upsert: true, returnDocument: "after" },
      );
      return result?.posterAttempts ?? 1;
    });

    if (attempts && attempts > 2) {
      const placeholder = {
        url: "",
        prompt: input.prompt,
        note: "Poster generation skipped after repeated attempts",
      };
      if (network) {
        network.state.data.posters = [placeholder];
      }
      await step?.run("save_placeholder_to_db", async () => {
        if (!runId) return;
        const { getDB } = await import("../db");
        const db = await getDB();
        await db.collection("results").updateOne(
          { runId },
          {
            $set: {
              "state.posters": [placeholder],
              "progress.posterGenerator": "skipped",
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      });
      return { success: false, skipped: true, prompt: input.prompt };
    }

    // Try gpt-image-1 first (cheaper), falling back to gpt-image-2 if the
    // model isn't available on this OpenAI project/key — dall-e-3 already
    // failed that way ("400 The model 'dall-e-3' does not exist"), and this
    // account's actual model access hasn't been verified for gpt-image-1
    // either, so don't strand the run on an unavailable model.
    const imageUrl = await step?.run("image-api-call", async () => {
      const generateWithModel = async (model: string, prompt: string) => {
        const response = await openai.images.generate({
          model,
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "low",
        });

        // gpt-image-1/gpt-image-2 don't support the `url` response field —
        // they always return base64 image data instead. That's why imageUrl
        // kept coming back empty (no error, just nothing to read from `.url`).
        const image = response.data?.[0];
        if (image?.url) return image.url;
        if (image?.b64_json) return `data:image/png;base64,${image.b64_json}`;
        return undefined;
      };

      const generate = async (prompt: string) => {
        try {
          return await generateWithModel("gpt-image-1", prompt);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes("does not exist")) throw error;
          console.error(
            "gpt-image-1 not available on this account, falling back to gpt-image-2:",
            error,
          );
          return await generateWithModel("gpt-image-2", prompt);
        }
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
        await db.collection("results").updateOne(
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
