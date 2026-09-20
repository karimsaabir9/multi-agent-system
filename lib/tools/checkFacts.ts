import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const checkFactsTool = createTool({
  name: "check_facts",
  description:
    "Verify a specific claim against fresh web search results before approving content. Returns corroborating sources so the moderator can judge accuracy.",
  parameters: z.object({
    claim: z
      .string()
      .describe("The specific factual claim to verify, e.g. an article title or key statement"),
  }),

  handler: async (input, { network, step }) => {
    const response = await step?.run("check_facts_api_call", async () => {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: input.claim,
          page: 1,
        }),
      });

      if (!res.ok) {
        throw new Error(`Serper API returned status ${res.status}`);
      }

      return res.json();
    });

    const sources: { title: string; snippet: string; link: string }[] = [];

    for (const item of response.organic ?? []) {
      sources.push({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
      });
      if (sources.length >= 5) break;
    }

    const factCheck = {
      claim: input.claim,
      corroboratingSources: sources,
      sourceCount: sources.length,
    };

    if (network) {
      network.state.data.factCheck = factCheck;
    }

    return factCheck;
  },
});
