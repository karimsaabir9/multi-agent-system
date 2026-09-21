import { createNetwork } from "@inngest/agent-kit";
import {
  contentCreatorAgent,
  moderatorAgent,
  newsScoutAgent,
  posterGeneratorAgent,
  sentimentAnalyzerAgent,
} from "./agents";

// This workflow is a fixed linear pipeline (scout -> sentiment -> content ->
// poster -> moderate), so routing doesn't need an LLM's judgment call — it's
// a direct read of what's missing from state. An LLM-based router here was
// unreliable (it didn't always echo an agent's exact name back), causing the
// network to stall in a retry loop that burned real API cost without ever
// making progress. This deterministic router is 100% predictable and free.
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
  router: ({ network }) => {
    const state = network?.state.data;

    if (!state?.articles?.length) return newsScoutAgent;
    if (!state?.sentiments?.length) return sentimentAnalyzerAgent;
    if (!state?.posts?.length) return contentCreatorAgent;
    if (!state?.posters?.length) return posterGeneratorAgent;
    if (state?.approved === undefined) return moderatorAgent;

    return undefined; // done
  },
  maxIter: 20,
});
