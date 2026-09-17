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
    console.log("Supervisor: Routing to agent:", agent_name);

    if (!network) {
      throw new Error("Network not Available");
    }

    // route to the agent
    const agent = network.agents.get(agent_name);
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
