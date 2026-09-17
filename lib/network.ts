import { createNetwork, createRoutingAgent, openai } from "@inngest/agent-kit";
import { doneTool, routeToAgentTool } from "./tools/router";
import {
  contentCreatorAgent,
  moderatorAgent,
  newsScoutAgent,
  posterGeneratorAgent,
  sentimentAnalyzerAgent,
} from "./agents";

const superVisorAgent = createRoutingAgent({
  name: "supervisor",
  description: "AI supervisor that orchestrates the news analysis workflow",
  system: ({ network }) => {
    const state = network?.state.data;
    console.log("🔍 [Supervisor] Current state:", state);
    const agents = Array.from(network?.agents.values() || []);

    return `You are an intelligent supervisor managing a news analysis workflow.
        **Current State:**
        - Articles found: ${state?.articles?.length || 0}  
        - Sentiments analyzed: ${state?.sentiments?.length || 0} 
        - Posts created: ${state?.posts?.length || 0}  
        - Posters generated: ${state?.posters?.length || 0}  
        - Content approved: ${state?.approved !== undefined ? (state.approved ? "Yes" : "No") : "Not yet reviewed"}  // Show approval status

        **Available Agents:**
        ${agents.map((a) => `- ${a.name}: ${a.description}`).join("\n")}  

        **Your Job:**
        1. Analyze the current state  
        2. Decide which agent should run next to progress the workflow 
        3. Use route_to_agent tool to select the next agent 
        4. Use done tool when all steps are complete and content is approved  

        **Workflow Logic:**
        - If no articles: route to "News Scout"  
        - If articles but no sentiments: route to "Sentiment Analyzer" 
        - If sentiments but no posts: route to "Content Creator"  
        - If posts but no posters: route to "Poster Designer" 
        - If everything done but not approved: route to "Moderator"  
        - If approved: call done 

        Think step by step and make the best decision!
        `;
  },
  model: openai({ model: "gpt-5.4" }),
  tools: [routeToAgentTool, doneTool],
  tool_choice: "auto",
  lifecycle: {
    onRoute: ({ result, network }) => {
      if (!result.toolCalls || result.toolCalls.length === 0) {
        return undefined;
      }

      // get the firt tool call

      const tool = result.toolCalls[0];

      // if done tool is called, stop network

      if (tool.tool.name === "done") {
        return undefined;
      }

      // if route_to_agent tool is called, route to the agent
      if (tool.tool.name === "route_to_agent") {
        const agentName =
          (tool.content as any)?.data || (tool.content as string);
        return [agentName];
      }
      return undefined;
    },
  },
});

export const newsAnalysisNetwork = createNetwork({
  name: "news_analysis_workflow",
  description:
    "Multi-agent system for news analysis and social media content creation",
  agents: [
    newsScoutAgent,
    sentimentAnalyzerAgent,
    contentCreatorAgent,
    posterGeneratorAgent,
    moderatorAgent,
  ],
  router: superVisorAgent,
  maxIter: 20,
});
