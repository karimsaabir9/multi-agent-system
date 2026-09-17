import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { newsAnalysisWorkflow } from "@/app/inngest/fuctions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    newsAnalysisWorkflow
  ],
});
