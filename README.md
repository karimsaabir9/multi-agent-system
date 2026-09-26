# AI News Agents

A multi-agent system that researches news, analyzes sentiment, drafts social
posts, generates a poster, and moderates the result — orchestrated by
[Inngest AgentKit](https://agentkit.inngest.com/) and run as durable,
resumable [Inngest](https://www.inngest.com/) functions.

**Live demo:** https://multi-agent-system-mocha.vercel.app

## How it works

A deterministic router (a plain function, not an LLM call) inspects the
current run state and routes work through five specialist agents in a fixed
pipeline, stopping once the moderator has approved or rejected the result:

1. **News Scout** — searches the web for articles on the given topic via
   [Serper](https://serper.dev/).
2. **Sentiment Analyzer** — scores each article's sentiment (positive /
   negative / neutral) with reasoning.
3. **Content Creator** — drafts Twitter and LinkedIn posts per article.
4. **Poster Generator** — generates one poster image for the run with
   OpenAI's `gpt-image-1`, falling back to `gpt-image-2` if the first model
   isn't available on the account, and to a generic safe prompt if the
   original is rejected by the safety system. Guarded by:
   - a durable MongoDB check that skips regeneration if a poster already
     exists for the run (idempotent against re-routing/replay), and
   - a hard cap of 2 attempts per run, after which it stores a placeholder
     instead of retrying indefinitely — a defense-in-depth cost control.
5. **Moderator** — fact-checks the main claim (via a Serper-backed
   `check_facts` tool) and then approves or rejects the batch.

Using a plain function router instead of an LLM-based one removes a class of
bugs where the model doesn't echo an agent's exact name back, which used to
stall the network in a retry loop.

Each step's progress is persisted to MongoDB (`results` collection, keyed by
`runId`) so the frontend can poll for live status and browse or delete past
runs.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Inngest](https://www.inngest.com/) + [AgentKit](https://agentkit.inngest.com/) for durable multi-agent orchestration
- [OpenAI](https://platform.openai.com/) (`gpt-5-mini` for agents, `gpt-image-1`/`gpt-image-2` for the poster)
- [Serper](https://serper.dev/) for web search and fact-checking
- [MongoDB](https://www.mongodb.com/) (Atlas in production) for run state and search history
- [TanStack Query](https://tanstack.com/query) for client-side data fetching/polling/mutations
- Tailwind CSS + shadcn-style UI components
- Deployed on [Vercel](https://vercel.com), with Inngest connected via the Vercel Marketplace integration

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

`INNGEST_DEV=1` is for local development only — remove it in production so
Inngest functions run against the Inngest Cloud (via `INNGEST_EVENT_KEY` /
`INNGEST_SIGNING_KEY`, auto-provisioned by the Vercel Marketplace
integration) instead of the local dev server.

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

## Deployment

The app is deployed on Vercel with:

- **MongoDB Atlas** for durable run state (a local `mongodb://localhost`
  URI won't work in production — Vercel's servers can't reach it).
- **Inngest**, connected through the [Vercel Marketplace](https://vercel.com/marketplace/inngest)
  integration, which auto-provisions `INNGEST_EVENT_KEY` and
  `INNGEST_SIGNING_KEY`.
- `OPENAI_API_KEY` and `SERPER_API_KEY` set as encrypted environment
  variables on both the Production and Preview environments.

To redeploy after changes:

```bash
vercel          # preview deployment
vercel --prod   # promote to production
```

## Project structure

```
app/
  page.tsx                  # Search UI, live job status, history, result cards
  api/
    inngest/route.ts        # Inngest serve handler
    run-agents/route.ts     # Kicks off a workflow run (creates the Mongo doc, sends the event)
    results/route.ts        # Lists recent runs (search history)
    results/[runId]/route.ts# GET a single run's status/state, DELETE to remove it from history
  inngest/
    client.ts                # Inngest client
    fuctions.ts               # The news-analysis-workflow function
lib/
  agents.ts                 # The 5 specialist agent definitions
  network.ts                # Deterministic router + network wiring
  db.ts                     # MongoDB connection helper
  tools/                    # Tools the agents call (search, save, image gen, fact-check, routing)
components/                 # SearchInput, SearchHistory, JobStatus, and result cards
```

## Usage

Enter a topic (e.g. "latest AI news") and run the agents. The UI polls for
status every 2 seconds while a run is in progress, and shows a search
history you can click back into to revisit any past run's results, or
delete (✕ button, with a confirmation prompt) runs you no longer need.

## Learn more

- [Inngest AgentKit docs](https://agentkit.inngest.com/)
- [Next.js documentation](https://nextjs.org/docs)
