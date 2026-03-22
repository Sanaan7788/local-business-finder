# Local Business Finder — Build Plan

A personal internal tool that discovers local businesses by multiple search strategies, identifies gaps in their online presence, generates AI-powered websites, deploys them, and manages the pipeline as a lead CRM.

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
Scaffolds the React app with Vite, configures Tailwind CSS v3, sets up React Router, TanStack Query, and an Axios-based API client. App shell with nav bar and routes for Dashboard, Businesses, BusinessDetail, and History pages.

### [x] Step 1.3 — Startup Env Validation
Zod schema validates all environment variables at boot time. Server refuses to start if the active LLM provider is missing its API key. Clear human-readable error messages identify exactly what is wrong and how to fix it.

---

## SECTION 2 — DATA LAYER

> Defines the business profile schema as the single source of truth, then builds the storage layer behind an interface so implementations can be swapped without touching any service.

### [x] Step 2.1 — Business Type Definitions + Zod Schemas
Full `Business` type covering all fields: discovery data, AI outputs, generated content, deployment links, and CRM fields. `RawBusiness` for scraper output. `UpdateBusiness` for CRM-only API updates. Frontend mirrors these as plain TypeScript types with UI helper maps for status colors and labels.

### [x] Step 2.2 — Repository Interface
`IBusinessRepository` interface with 8 methods: `create`, `findAll`, `findById`, `findDuplicate`, `update`, `updateLead`, `delete`, `count`. `FindAllOptions` supports filter, sort, and pagination. Repository factory returns the active implementation based on `STORAGE_BACKEND` env var.

### [x] Step 2.3 — CSV Repository Implementation
Implements all 8 interface methods against a CSV file. Atomic writes (write to `.tmp`, rename on success) prevent data loss on crash. Schema validation on every row read — corrupt rows are skipped and logged. Filter, sort, and pagination applied in memory. JSON columns for nested objects (`keywords`, `insights`, `outreach`).

### [x] Step 2.4 — PostgreSQL Repository Implementation (Drizzle ORM + Neon)
Full Postgres implementation of `IBusinessRepository` using Drizzle ORM and the Neon serverless driver. Two tables: `businesses` and `scrape_sessions`. Activated by setting `STORAGE_BACKEND=postgres` and `DATABASE_URL`. Scrape session history migrated from JSON file to `scrape_sessions` table. Migration scripts: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`. CSV repository preserved — both backends coexist, selectable via env var.

---

## SECTION 3 — SCRAPER

> Automates Google Maps to discover local businesses. Supports multiple search strategies — zipcode, neighborhood, street intersection, landmark, coordinate pair — to maximize coverage of any target area. Built defensively with conservative pacing, retry/backoff, CAPTCHA detection, deduplication, and graceful failure handling.

**Risk note:** Scraping Google Maps may violate their Terms of Service. This tool is for personal, non-commercial use only. Use responsibly with conservative request pacing.

### [x] Step 3.1 — Playwright Setup + Browser Lifecycle
`BrowserManager` singleton manages Chromium launch, context creation, and teardown. Blocks images, fonts, and media (keeps CSS for Maps rendering). Realistic user agent and locale set on context. `randomDelay()` and `withRetry()` utilities for paced, resilient scraping.

### [x] Step 3.2 — Google Maps Navigation Flow
`MapsNavigator` handles search URL construction, results feed detection, CAPTCHA detection, and scroll-to-load. Scrolls the sidebar panel (not the page) with stall detection — stops when no new cards appear for 3 consecutive scrolls. `openListingByName()` clicks by business name (resilient to DOM re-renders). `goBackToResults()` re-navigates to search URL instead of using `goBack()` (Maps detail panels have no browser history). Search term is a free-form string — supports any location descriptor (zipcode, address, neighborhood name, intersection, landmark, lat/lng).

### [x] Step 3.3 — Listing Extractor
`MapsExtractor` extracts data in two modes. Card mode reads all visible cards in one pass without clicking (name, rating, category, description). Detail mode opens each listing panel and extracts phone, website URL, full address, review count. Pre-collect pattern: all card data gathered first, then each detail opened by name to avoid index-shift issues from DOM re-renders.

### [x] Step 3.5 — Deduplication Service
`Deduplicator` maintains two in-memory indexes per scraping session: phone (digits-only normalized) and name+address (lowercased, whitespace-collapsed). Loaded once from the repository at session start for O(1) lookups. `register()` keeps the index current after each save. Prevents re-scraping the same business across multiple sessions and search strategies.

### [x] Step 3.6 — Scraper Routes + API
Endpoints wired into Express:
- `POST /api/scraper/start` — single search: zipcode + category + maxResults, returns 202 immediately
- `POST /api/scraper/batch` — multi-category batch: zipcode + categories[] + maxResults, queues all as sequential sessions
- `POST /api/scraper/stop` — signals the running session to stop; clears the entire batch queue
- `GET /api/scraper/status` — full session state + batch progress (totalJobs, completedJobs, pendingJobs)
- `GET /api/scraper/batch-progress` — batch queue state only

### [x] Step 3.7 — Scrape Session History + Zipcode Index
Completed sessions persisted to storage (JSON file for CSV backend, `scrape_sessions` table for Postgres). Each session stores full savedList / skippedList / errorList / foundNames for post-session review. Zipcode index aggregates sessions per zipcode (total sessions, total saved, last scraped date). History viewable in the frontend History page.

---

## SECTION 4 — LLM LAYER

> Provider-agnostic LLM abstraction. All AI features route through this layer. Switching providers requires changing one env var.

### [x] Step 4.1 — ILLMProvider Interface + LLMFactory + All Adapters
`ILLMProvider` interface with `complete(request)` method. `LLMFactory.create(provider)` returns the correct adapter. Normalized `LLMRequest` and `LLMResponse` shapes ensure consistent input/output regardless of provider. Three adapters implemented: DeepSeek (via NVIDIA NIM), Claude (Anthropic SDK), OpenAI (official SDK).

### [x] Step 4.4 + 4.5 — Config-Based Provider Switching + LLMService Orchestrator
`llm.config.ts` maps task names to providers with a fallback to `LLM_PROVIDER` env. `LLMService.complete(task, request)` is the single entry point for all AI calls — selects the right provider per task, caches adapter instances, and returns a normalized response.

---

## SECTION 5 — AI PROCESSING

> Uses the LLM layer to enrich business profiles with keywords, summaries, and insights.

### [x] Step 5.1 — Keywords Prompt + Parser + Integration
Generates 8 relevant local SEO keywords for a business. Stored in `business.keywords[]`.

### [x] Step 5.2 — Summary Prompt + Parser + Integration
Generates a 2–3 sentence business summary suitable for outreach context. Stored in `business.summary`.

### [x] Step 5.3 — Insights Prompt + Parser + Integration
Generates: `whyNeedsWebsite`, `whatsMissingOnline`, and `opportunities[]`. Stored in `business.insights`.

### [x] Step 5.4 — AI Routes + API
- `POST /api/businesses/:id/analyze` — runs keywords → summary → insights in sequence
- `GET /api/businesses/:id/insights` — returns stored insights
- `POST /api/businesses/:id/keywords` — regenerates keywords only

---

## SECTION 6 — LEAD MANAGEMENT

> CRM layer for tracking business leads through the sales pipeline.

### [x] Step 6.1 — Lead Scorer
Pure function scoring 0–100 based on: no website (+40), no reviews (+20), low rating (+15), phone available (+10), description (+5), mid rating (+5). Maps to priority: high / medium / low.

### [x] Step 6.2 — Lead Service (Status, Notes, CRUD)
Validated status transitions, note updates, last-contacted tracking, and pipeline stats aggregation.

### [x] Step 6.3 — Lead Routes + API
- `GET /api/businesses` — list with filter/sort/search/pagination
- `GET /api/businesses/stats` — total, byStatus, byPriority, noWebsite, deployed
- `GET /api/businesses/:id` — single business profile
- `PATCH /api/businesses/:id/status` — validated status transition
- `PATCH /api/businesses/:id/notes` — update notes
- `PATCH /api/businesses/:id/contacted` — update last contacted date
- `DELETE /api/businesses/:id` — hard delete

---

## SECTION 7 — WEBSITE GENERATION

> Uses LLM to generate a complete single-file HTML website for a business.

### [x] Step 7.1 — Website Prompt Builder
Constructs a detailed prompt using all available business data. Instructs the LLM to produce a complete, mobile-responsive single-file HTML website using Tailwind CSS CDN. No placeholder text allowed.

### [x] Step 7.2 — Website Generator Service
Calls LLM, strips markdown fences, validates response (DOCTYPE check, closing tag, minimum length), stores in `business.generatedWebsiteCode`.

### [x] Step 7.3 — Project File Assembler + Slug Utility
`slugify(name, zipcode)` → URL-safe folder name. `assemblePackage()` returns `{ slug, indexHtml, vercelJson }`.

### [x] Step 7.4 — Website Routes + API
- `POST /api/businesses/:id/website` — trigger generation
- `GET /api/businesses/:id/website` — return slug + HTML

---

## SECTION 8 — INTEGRATIONS

> Pushes generated websites to GitHub and deploys them to Vercel.

### [ ] Step 8.1 — GitHub Service + Push Website
`GitHubService` uses Octokit to create/update `businesses/{slug}/index.html` in a shared repo. Returns GitHub file URL stored in `business.githubUrl`.

### [ ] Step 8.2 — Vercel Service + Deploy
`VercelService` deploys from the GitHub subfolder. Polls for completion. Returns hosted URL stored in `business.deployedUrl`.

### [ ] Step 8.3 — Deployment Routes + API
- `POST /api/businesses/:id/deploy` — push to GitHub then deploy to Vercel
- `GET /api/businesses/:id/deployment` — return GitHub URL + deployed URL + status

---

## SECTION 9 — OUTREACH

> Generates personalized email copy and cold call scripts.

### [ ] Step 9.1 — Outreach Prompt Builder + Parser
Prompt uses business data and insights. Returns structured JSON: email (subject + body) and call script (opener, value proposition, objection handlers, close). Stored in `business.outreach`.

### [ ] Step 9.2 — Outreach Routes + API
- `POST /api/businesses/:id/outreach` — generate outreach content
- `GET /api/businesses/:id/outreach` — return stored outreach

---

## SECTION 10 — FRONTEND

> Full dashboard UI for managing the entire pipeline.

### [x] Step 10.1 — App Shell + Routing
React Router layout with persistent nav. Routes: Dashboard (`/`), Businesses list (`/businesses`), Business detail (`/businesses/:id`), History (`/history`).

### [x] Step 10.2 — API Client + TanStack Query Setup
Axios instance with base URL and error interceptor. TanStack Query hooks for all resources. Scraper status polls every 3s while running, 10s otherwise.

### [x] Step 10.3 — Dashboard Page + Stats + Scraper Control
Stats bar: total, no-website, deployed, hot leads. Pipeline status grid (click to filter). Scraper control with two modes: single search (searchable category dropdown) and batch mode (multi-select checklist of 80+ categories). Max results slider (5–200). Live progress bar showing found/saved/skipped/errors. Batch progress shows completed/total jobs and pending queue.

### [x] Step 10.4 — Business List + Filters + Table
Sortable table: Name, Category, Rating, Website, Score, Status. Filter: lead status, priority, has-website. Search bar. Pagination.

### [x] Step 10.5 — Business Detail Page + Tabs
Six tabs: Overview, Insights, Website, Outreach, CRM, Deployment.

### [x] Step 10.6 — Scraper History Page
Two views: Zipcodes table (sessions count, total saved, last scraped, browse link) and Sessions list (expandable to 4-tab detail panel).

### [x] Step 10.7 — Session Profile Viewer
Expandable session detail with 4 tabs:
- **Saved** — full contact card: name, address, phone with copy button, priority badge, no-website flag, click to open profile
- **Skipped** — duplicates with "view existing" link
- **Errors** — failed extractions with "Search Maps" link for manual lookup
- **Found** — all card names with individual Maps search links

### [ ] Step 10.8 — Deployment UI
Deploy button, polling status, GitHub + Vercel URL display, iframe preview.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| State | TanStack Query |
| Scraping | Playwright (Chromium) |
| LLM | Provider-agnostic adapter layer |
| Storage | PostgreSQL via Drizzle ORM + Neon (primary) / CSV (fallback) |
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
| OpenAI | gpt-4.1 | Ready (set `LLM_PROVIDER=openai`) |

## Search Strategies Supported

Google Maps accepts any free-form location string. The scraper supports all of these:

| Strategy | Example input | Use case |
|----------|--------------|----------|
| Zipcode | `77477` | Standard — one postal delivery zone |
| Street address | `123 Main St, Sugar Land TX` | Single-street sweep |
| Intersection | `Main St & 1st Ave, Houston TX` | Micro-area sweep |
| Neighborhood | `Montrose, Houston TX` | Named district |
| Landmark | `near Galleria Houston` | Anchor-point radius |
| Coordinates | `29.6197,-95.6349` | Precise lat/lng drop |
| Corridor | `Westheimer Rd, Houston TX` | Business strip |

Use batch mode to queue multiple of these for the same area.
