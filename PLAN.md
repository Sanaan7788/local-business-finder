# Local Business Finder — Build Plan

A personal internal tool that discovers local businesses by zipcode, identifies gaps in their online presence, generates AI-powered websites, deploys them, and manages the pipeline as a lead CRM.

---

## Progress Legend

| Symbol | Meaning |
|--------|---------|
| `[x]` | Complete |
| `[ ]` | Pending |

---

## SECTION 1 — FOUNDATION

> Sets up the full project skeleton. Backend and frontend initialized separately, environment validated at startup, shared data contracts defined before any feature is built.

### [x] Step 1.1 — Initialize Backend (Node / Express / TypeScript)
Creates the Express server with TypeScript, Winston logger, error middleware, and request logging. Health check endpoint at `GET /api/health`. Entry point at `backend/src/index.ts`.

### [x] Step 1.2 — Initialize Frontend (React / Vite / TypeScript / Tailwind)
Scaffolds the React app with Vite, configures Tailwind CSS v3, sets up React Router, TanStack Query, and an Axios-based API client. App shell with nav bar and placeholder pages for Dashboard and Businesses.

### [x] Step 1.3 — Startup Env Validation
Zod schema validates all environment variables at boot time. Server refuses to start if the active LLM provider is missing its API key. Clear human-readable error messages identify exactly what is wrong and how to fix it.

---

## SECTION 2 — DATA LAYER

> Defines the business profile schema as the single source of truth, then builds the storage layer behind an interface so the CSV implementation can be swapped for a database without touching any service.

### [x] Step 2.1 — Business Type Definitions + Zod Schemas
Full `Business` type covering all fields: discovery data, AI outputs, generated content, deployment links, and CRM fields. `RawBusiness` for scraper output. `UpdateBusiness` for CRM-only API updates. Frontend mirrors these as plain TypeScript types with UI helper maps for status colors and labels.

### [x] Step 2.2 — Repository Interface
`IBusinessRepository` interface with 8 methods: `create`, `findAll`, `findById`, `findDuplicate`, `update`, `updateLead`, `delete`, `count`. `FindAllOptions` supports filter, sort, and pagination. Repository factory returns the active implementation based on `STORAGE_BACKEND` env var.

### [x] Step 2.3 — CSV Repository Implementation
Implements all 8 interface methods against a CSV file. Atomic writes (write to `.tmp`, rename on success) prevent data loss on crash. Schema validation on every row read — corrupt rows are skipped and logged. Filter, sort, and pagination applied in memory. JSON columns for nested objects (`keywords`, `insights`, `outreach`).

---

## SECTION 3 — SCRAPER

> Automates Google Maps to discover local businesses. Built defensively with conservative pacing, retry/backoff, CAPTCHA detection, deduplication, and graceful failure handling.

**Risk note:** Scraping Google Maps may violate their Terms of Service. This tool is for personal, non-commercial use only. Use responsibly with conservative request pacing.

### [x] Step 3.1 — Playwright Setup + Browser Lifecycle
`BrowserManager` singleton manages Chromium launch, context creation, and teardown. Blocks images, fonts, and media (keeps CSS for Maps rendering). Realistic user agent and locale set on context. `randomDelay()` and `withRetry()` utilities for paced, resilient scraping.

### [x] Step 3.2 — Google Maps Navigation Flow
`MapsNavigator` handles search URL construction, results feed detection, CAPTCHA detection, and scroll-to-load. Scrolls the sidebar panel (not the page) with stall detection — stops when no new cards appear for 3 consecutive scrolls. `openListingByName()` clicks by business name (resilient to DOM re-renders). `goBackToResults()` re-navigates to search URL instead of using `goBack()` (Maps detail panels have no browser history).

### [x] Step 3.3 — Listing Extractor
`MapsExtractor` extracts data in two modes. Card mode reads all visible cards in one pass without clicking (name, rating, category, description). Detail mode opens each listing panel and extracts phone, website URL, full address, review count. Pre-collect pattern: all card data gathered first, then each detail opened by name to avoid index-shift issues from DOM re-renders.

### [x] Step 3.5 — Deduplication Service
`Deduplicator` maintains two in-memory indexes per scraping session: phone (digits-only normalized) and name+address (lowercased, whitespace-collapsed). Loaded once from the repository at session start for O(1) lookups. `register()` keeps the index current after each save. Prevents re-scraping the same business across multiple sessions.

### [x] Step 3.6 — Scraper Routes + API
Three endpoints wired into Express:
- `POST /api/scraper/start` — Zod-validated, starts session in background, returns 202 immediately
- `POST /api/scraper/stop` — signals the running session to stop after current listing
- `GET /api/scraper/status` — returns full session state (running, found, saved, skipped, errors) — safe to poll

---

## SECTION 4 — LLM LAYER

> Provider-agnostic LLM abstraction. All AI features route through this layer. Switching providers requires changing one env var.

### [x] Step 4.1 — ILLMProvider Interface + LLMFactory + All Adapters
`ILLMProvider` interface with `complete(request)` method. `LLMFactory.create(provider)` returns the correct adapter. Normalized `LLMRequest` and `LLMResponse` shapes ensure consistent input/output regardless of provider. All three adapters implemented: DeepSeek (via NVIDIA NIM), Claude (Anthropic SDK), OpenAI (official SDK). Live DeepSeek API call verified.

### [x] Step 4.4 + 4.5 — Config-Based Provider Switching + LLMService Orchestrator
`llm.config.ts` maps task names to providers with a fallback to `LLM_PROVIDER` env. `LLMService.complete(task, request)` is the single entry point for all AI calls — selects the right provider per task, caches adapter instances, and returns a normalized response. All AI features call this, never an adapter directly.

---

## SECTION 5 — AI PROCESSING

> Uses the LLM layer to enrich business profiles with keywords, summaries, and insights. All prompts are pure functions — testable without an LLM call.

### [x] Step 5.1 — Keywords Prompt + Parser + Integration
Generates 8 relevant local SEO keywords for a business based on its name, category, address, and description. Parsed from JSON response. Stored in `business.keywords[]`.

### [x] Step 5.2 — Summary Prompt + Parser + Integration
Generates a 2–3 sentence business summary suitable for outreach context. Stored in `business.summary`.

### [x] Step 5.3 — Insights Prompt + Parser + Integration
Generates three structured fields: `whyNeedsWebsite`, `whatsMissingOnline`, and `opportunities[]`. Stored in `business.insights`. Uses keywords from step 5.1 as context for richer output.

### [x] Step 5.4 — AI Routes + API
Three endpoints wired into Express under `/api/businesses/:id/`:
- `POST /analyze` — runs keywords → summary → insights in sequence, saves each result
- `GET /insights` — returns stored insights (404 if not yet generated)
- `POST /keywords` — regenerates keywords only

---

## SECTION 6 — LEAD MANAGEMENT

> CRM layer for tracking business leads through the sales pipeline.

### [x] Step 6.1 — Lead Scorer
Pure function that scores a business 0–100 based on configurable rules (no website = +40, no reviews = +20, low rating = +15, etc.). Score maps to priority: high / medium / low.

### [x] Step 6.2 — Lead Service (Status, Notes, CRUD)
`LeadService` with validated status transitions (e.g. `new → qualified → contacted → interested → closed`), note updates, last-contacted tracking, and pipeline stats aggregation.

### [x] Step 6.3 — Lead Routes + API
- `GET /api/businesses` — list with filter/sort/search/pagination
- `GET /api/businesses/stats` — total, byStatus, byPriority, noWebsite, deployed
- `GET /api/businesses/:id` — single business profile
- `PATCH /api/businesses/:id/status` — validated status transition (422 on invalid)
- `PATCH /api/businesses/:id/notes` — update notes
- `PATCH /api/businesses/:id/contacted` — update last contacted date
- `DELETE /api/businesses/:id` — hard delete

---

## SECTION 7 — WEBSITE GENERATION

> Uses LLM to generate a complete single-file HTML website for a business, then assembles it for deployment.

### [x] Step 7.1 — Website Prompt Builder
Constructs a detailed prompt using business name, category, address, phone, description, keywords, summary, and insights opportunities. Instructs the LLM to produce a complete, mobile-responsive single-file HTML website using Tailwind CSS CDN. No placeholder text allowed — all real business data.

### [x] Step 7.2 — Website Generator Service
Calls the LLM with the website prompt, strips markdown fences if present, validates the response is valid HTML (DOCTYPE check, closing tag check, minimum length), and stores in `business.generatedWebsiteCode`.

### [x] Step 7.3 — Project File Assembler + Slug Utility
`slugify(name, zipcode)` → URL-safe folder name (e.g. `marias-nail-salon-11201`). `assemblePackage()` returns `{ slug, indexHtml, vercelJson }` ready for GitHub/Vercel upload.

### [x] Step 7.4 — Website Routes + API
- `POST /api/businesses/:id/website` — trigger generation (10–60s, LLM dependent)
- `GET /api/businesses/:id/website` — return slug + HTML + vercelJson

---

## SECTION 8 — INTEGRATIONS

> Pushes generated websites to GitHub and deploys them to Vercel. Each business gets its own folder in a shared repo.

### [ ] Step 8.1 — Slug Utility + Repo Naming Strategy
`slugify()` function converts business name + zipcode to a URL-safe folder name (e.g. `pizza-palace-10001`). Used consistently across GitHub paths, Vercel project names, and frontend URLs.

### [ ] Step 8.2 — GitHub Service + Push Website
`GitHubService` uses Octokit to create or update files in `businesses/{slug}/index.html` within a shared repo. Returns the GitHub file URL stored in `business.githubUrl`.

### [ ] Step 8.3 — Vercel Service + Deploy
`VercelService` calls the Vercel API to deploy from the GitHub subfolder. Polls for deployment completion. Returns hosted URL stored in `business.deployedUrl`.

### [ ] Step 8.4 — Deployment Routes + API
- `POST /api/business/:id/deploy` — push to GitHub then deploy to Vercel
- `GET /api/business/:id/deployment` — return GitHub URL + deployed URL + status

---

## SECTION 9 — OUTREACH

> Generates personalized email copy and cold call scripts based on each business's specific gaps.

### [ ] Step 9.1 — Outreach Prompt Builder + Parser
Constructs prompt using business data and insights. Returns structured JSON with email (subject + body) and call script (opener, value proposition, objection handlers, close). Stored in `business.outreach`.

### [ ] Step 9.2 — Outreach Routes + API
- `POST /api/business/:id/outreach` — generate outreach content
- `GET /api/business/:id/outreach` — return stored outreach

---

## SECTION 10 — FRONTEND

> Full dashboard UI for managing the entire pipeline.

### [ ] Step 10.1 — App Shell + Routing
React Router layout with persistent nav. Routes for Dashboard, Businesses list, and Business detail. Already scaffolded with placeholder pages.

### [ ] Step 10.2 — API Client + TanStack Query Setup
Axios instance with base URL and error interceptor. TanStack Query hooks for each resource (`useBusinesses`, `useBusiness`, `useScraperStatus`). Automatic background refetch for scraper status polling.

### [ ] Step 10.3 — Dashboard Page + Stats
Stats bar: total businesses, no-website count, deployed count, hot leads. Recent activity feed. Quick-start scraper control (zipcode input + start button).

### [ ] Step 10.4 — Business List + Filters + Table
Sortable table with columns: Name, Category, Website, Rating, Priority Score, Lead Status, Actions. Filter panel: zipcode, lead status, priority, has-website toggle. Search bar (name / address / category). Pagination.

### [ ] Step 10.5 — Business Detail Page + Tabs
Six tabs per business:
- **Overview** — scraped data + AI summary
- **Insights** — why they need a website, what's missing, opportunities
- **Website** — generated code preview + deploy button
- **Outreach** — email copy + call script with copy buttons
- **CRM** — lead status selector, notes editor, last-contacted date
- **Deployment** — GitHub link, Vercel URL, iframe preview

### [ ] Step 10.6 — Scraper Control UI
Zipcode input, category selector, max results slider. Start / Stop button. Live progress bar polling `/api/scraper/status` every 3 seconds while running. Shows found / saved / skipped / errors counts.

### [ ] Step 10.7 — Lead Management UI
Inline status update (dropdown in table row). Notes modal. Last-contacted date picker. Pipeline stats panel (count per status).

### [ ] Step 10.8 — Deployment UI
Deploy button triggers GitHub push + Vercel deploy. Shows deployment status with polling. GitHub link + Vercel hosted URL displayed. Iframe preview of the deployed site.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | TanStack Query |
| Scraping | Playwright (Chromium) |
| LLM | Provider-agnostic adapter layer |
| Storage | CSV (repository pattern — DB-ready) |
| GitHub | Octokit SDK |
| Deployment | Vercel API |
| Validation | Zod |
| Logging | Winston |
| Queue | p-queue |

## LLM Providers Supported

| Provider | Model | Status |
|----------|-------|--------|
| DeepSeek (via NVIDIA NIM) | deepseek-ai/deepseek-v3.2 | Active (default) |
| Anthropic Claude | claude-sonnet-4-6 | Ready (set `LLM_PROVIDER=claude`) |
| OpenAI | gpt-4.1 | Adapter in step 4.3 |
| Google Gemini | gemini-2.0-flash | Future |
| Mistral | mistral-large-latest | Future |
| Groq | llama-3.3-70b-versatile | Future |

## Switching Providers

Change one line in `.env`:
```
LLM_PROVIDER=claude      # use Claude Sonnet 4.6
LLM_PROVIDER=deepseek    # use DeepSeek v3.2 via NVIDIA NIM
LLM_PROVIDER=openai      # use GPT-4.1
```
No code changes required.
