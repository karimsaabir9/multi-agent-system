import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const routeToAgentTool = createTool({
  name: "route_to_agent",
  description: "Route to the next agent in the workflow",
  parameters: z.object({
    agent_name: z.string().describe("The name of the agent to route to"),
    reasoning: z
      .string()
      .describe("The reasoning for routing to the next agent"),
  }),
  handler: async ({ agent_name, reasoning }, { network }) => {
    console.log("Supervisor: Routing to agent:", agent_name, "-", reasoning);

    if (!network) {
      throw new Error("Network not Available");
    }

    // Exact match first, then fall back to a normalized (case/whitespace/
    // punctuation-insensitive) match — the router LLM doesn't always echo
    // agent names byte-for-byte, and a mismatch here used to throw and stall
    // the whole network instead of just routing correctly.
    let agent = network.agents.get(agent_name);
    if (!agent) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const target = normalize(agent_name);
      agent = Array.from(network.agents.values()).find(
        (a) => normalize(a.name) === target,
      );
    }

    if (!agent) {
      throw new Error(`Agent ${agent_name} not found`);
    }

    // route to the agent
    return agent.name;
  },
});

export const doneTool = createTool({
  name: "done",
  description: "Signal that the workflow is complete",
  parameters: z.object({
    reasoning: z.string().describe("The reasoning for completing the workflow"),
  }),
  handler: async ({ reasoning }) => {
    console.log("Supervisor: Workflow completed with reasoning:", reasoning);
    return undefined;
  },
});
