# AI News Agents

A multi-agent system that researches news, analyzes sentiment, drafts social
posts, generates a poster, and moderates the result — orchestrated by an
LLM supervisor via [Inngest AgentKit](https://agentkit.inngest.com/) and run
as durable, resumable [Inngest](https://www.inngest.com/) functions.

## How it works

A supervisor agent routes work through five specialist agents based on the
current run state, stopping once the moderator approves (or rejects) the
result:

1. **News Scout** — searches the web for articles on the given topic via
   [Serper](https://serper.dev/).
2. **Sentiment Analyzer** — scores each article's sentiment (positive /
   negative / neutral) with reasoning.
3. **Content Creator** — drafts Twitter and LinkedIn posts per article.
4. **Poster Generator** — generates one poster image for the run with
   OpenAI's `gpt-image-2`, falling back to a generic prompt if the original
   is rejected by the safety system. Idempotent — a durable MongoDB check
   stops it from regenerating if the network re-routes to it after a poster
   already exists.
5. **Moderator** — fact-checks the main claim (via a Serper-backed
   `check_facts` tool) and then approves or rejects the batch.

Each step's progress is persisted to MongoDB (`results` collection, keyed by
`runId`) so the frontend can poll for live status and browse past runs.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Inngest](https://www.inngest.com/) + [AgentKit](https://agentkit.inngest.com/) for durable multi-agent orchestration
- [OpenAI](https://platform.openai.com/) (`gpt-5-mini` / `gpt-5.4` for agents, `gpt-image-2` for the poster)
- [Serper](https://serper.dev/) for web search and fact-checking
- [MongoDB](https://www.mongodb.com/) for run state and search history
- [TanStack Query](https://tanstack.com/query) for client-side data fetching/polling
- Tailwind CSS + shadcn-style UI components

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root with:

```bash
INNGEST_DEV=1
SERPER_API_KEY=your_serper_api_key
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
```

### 3. Run the dev server

```bash
npm run dev
```

This starts Next.js on [http://localhost:3000](http://localhost:3000) and
serves the Inngest function at `/api/inngest`.

### 4. Run the Inngest Dev Server

In a separate terminal:

```bash
npx inngest-cli@latest dev
```

Open [http://localhost:8288](http://localhost:8288) to watch and debug
workflow runs (per-step traces, retries, and payloads).

## Project structure

```
app/
  page.tsx                  # Search UI, live job status, history, result cards
  api/
    inngest/route.ts        # Inngest serve handler
    run-agents/route.ts     # Kicks off a workflow run (creates the Mongo doc, sends the event)
    results/route.ts        # Lists recent runs (search history)
    results/[runId]/route.ts# Fetches a single run's status/state
  inngest/
    client.ts                # Inngest client
    fuctions.ts               # The news-analysis-workflow function
lib/
  agents.ts                 # The 5 specialist agent definitions
  network.ts                # Supervisor router + network wiring
  db.ts                     # MongoDB connection helper
  tools/                    # Tools the agents call (search, save, image gen, fact-check, routing)
components/                 # SearchInput, SearchHistory, JobStatus, and result cards
```

## Usage

Enter a topic (e.g. "latest AI news") and run the agents. The UI polls for
status every 2 seconds while a run is in progress, and shows a search
history you can click back into to revisit any past run's results.

## Learn more

- [Inngest AgentKit docs](https://agentkit.inngest.com/)
- [Next.js documentation](https://nextjs.org/docs)
