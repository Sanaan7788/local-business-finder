# Local Business Finder — Documentation

A personal internal tool that finds local businesses without an online presence, generates AI-powered websites for them, deploys those websites live, and manages the entire pipeline as a CRM.

---

## What This Tool Does

You give it a search target — a zipcode, street address, neighborhood name, intersection, landmark, or coordinate pair. It opens Google Maps, scrolls through every business listing, and scrapes each one's name, phone, address, rating, review count, and whether they have a website. It then uses an LLM to write a business summary, generate SEO keywords, and produce insights about why that business would benefit from a website. For businesses that qualify as leads, it generates a complete single-file HTML website using AI, pushes it to GitHub, deploys it live on Vercel, and produces a personalized email and cold-call script for outreach. All of this is tracked in a dashboard where you can manage leads through a CRM pipeline.

To maximize coverage of any area, use batch mode — queue 50+ category searches for the same target, each running as an independent session with full deduplication across all of them.

---

## Architecture Overview

```
Frontend (React + Vite)
    │
    │  HTTP (REST API)
    ▼
Backend (Express + TypeScript)
    │
    ├── Scraper Layer       — Playwright → Google Maps (any location descriptor)
    ├── LLM Layer           — Provider-agnostic AI abstraction
    ├── AI Processing       — Keywords, summary, insights prompts
    ├── Website Generator   — AI-generated HTML websites
    ├── GitHub Service      — Push generated sites to GitHub
    ├── Vercel Service      — Deploy from GitHub to Vercel
    ├── Lead Service        — CRM pipeline management
    └── Data Layer          — PostgreSQL (Drizzle + Neon) / CSV fallback
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend runtime | Node.js + Express + TypeScript | Mature, async-first, great ecosystem |
| Frontend | React 18 + Vite + TypeScript | Fast dev server, component model fits the UI |
| Styling | Tailwind CSS v3 | Utility-first, no design system overhead |
| State / data fetching | TanStack Query | Caching, polling, background refetch out of the box |
| Routing | React Router v6 | Industry standard |
| Scraping | Playwright (Chromium) | Full browser automation, handles Maps' JS rendering |
| LLM abstraction | Custom adapter pattern | Swap providers without touching feature code |
| Storage (primary) | PostgreSQL via Drizzle ORM + Neon | Persistent, hosted, survives redeploys, future-proof |
| Storage (fallback) | CSV (repository interface) | Zero-setup for local dev; switch via env var |
| GitHub integration | Octokit SDK | Official GitHub REST client |
| Deployment | Vercel REST API | Fast deploys, free tier |
| Validation | Zod | Runtime safety at all boundaries |
| Logging | Winston | Structured JSON logs |
| Queue | p-queue | Sequential scraping with concurrency control |

---

## LLM Providers

The app has a provider-agnostic LLM layer. All AI calls go through `LLMService.complete(task, request)` — never directly to a provider. Switching providers requires changing one environment variable.

| Provider | Model | How to activate |
|---|---|---|
| DeepSeek (via NVIDIA NIM) | deepseek-ai/deepseek-v3.2 | `LLM_PROVIDER=deepseek` (default) |
| Anthropic Claude | claude-sonnet-4-6 | `LLM_PROVIDER=claude` |
| OpenAI | gpt-4.1 | `LLM_PROVIDER=openai` |

Individual tasks can be routed to different providers. Edit `llm.config.ts` to override:
```ts
taskProviderMap['websiteGeneration'] = 'claude';  // use Claude only for website generation
taskProviderMap['keywords'] = 'deepseek';          // use DeepSeek for keywords
```

---

## Search Strategies

Google Maps accepts any free-form location string as its search target. The scraper supports all of these natively — just pass the string as the `zipcode` field:

| Strategy | Example | Notes |
|---|---|---|
| **Zipcode** | `77477` | Standard. One postal zone ≈ 2,000 businesses across all categories |
| **Street address** | `123 Main St, Sugar Land TX` | Single-street sweep, very targeted |
| **Intersection** | `Main St & 1st Ave, Houston TX` | Micro-area, ~0.5 mile radius |
| **Neighborhood name** | `Montrose, Houston TX` | Named district; Google resolves the boundary |
| **Landmark** | `near Galleria Houston` | Anchor-point radius around a known place |
| **Coordinates** | `29.6197,-95.6349` | Precise lat/lng; useful for grid sweeps |
| **Corridor / road** | `Westheimer Rd, Houston TX` | Business strip along a road |

### Why not city or state?

City and state searches return a massive, unordered result set that Google truncates at ~20 visible cards regardless of scroll depth. You get less total data than a well-constructed set of micro-searches. The right approach is to decompose the area into many small searches — by zipcode, neighborhood, or intersection — and use batch mode to run them all.

### Maximizing coverage of an area

Google Maps shows at most ~20 results per search (sometimes up to 40 with heavy scrolling). To cover all ~2,000 businesses in a single zipcode:

**Strategy 1 — Category batch (recommended)**
Use batch mode to queue 50–80 category searches for the same zipcode. Each search targets a specific business type and returns up to 20 results. 80 categories × 20 results = up to 1,600 unique businesses. Deduplication removes any overlaps automatically.

**Strategy 2 — Intersection grid**
Divide the zipcode into a grid of street intersections (every 0.5–1 mile). Search `"businesses near [intersection]"` for each grid point. Effective for dense urban areas. Can be generated from a list of cross-streets.

**Strategy 3 — Sub-neighborhood sweep**
Use named sub-areas within a zipcode (apartment complexes, shopping centers, business parks) as search targets. Works well in suburban areas where a single zipcode contains multiple distinct commercial zones.

The most practical approach: run Category batch first (quick, high yield), then follow up with intersection or sub-neighborhood searches for categories you care most about.

---

## Data Model

Every business in the system has a single profile that evolves as it moves through the pipeline.

### Business Profile Fields

**Identity**
- `id` — UUID, generated on creation
- `createdAt` / `updatedAt` — ISO timestamps

**Discovery** *(scraped from Google Maps)*
- `name` — business name
- `phone` — phone number (nullable)
- `address` — full street address
- `zipcode` — the search target used (zipcode, intersection, neighborhood, etc.)
- `category` — business type
- `description` — short description from Maps listing (nullable)
- `website` — boolean: does this business have a website?
- `websiteUrl` — URL if they have one (nullable)
- `rating` — Google rating 0–5 (nullable)
- `reviewCount` — total review count (nullable)
- `googleMapsUrl` — direct link to their Maps listing (nullable)

**AI Outputs** *(generated by LLM service)*
- `keywords` — array of 5–10 SEO keywords
- `summary` — 2–3 sentence business description for outreach context
- `insights` — structured object:
  - `whyNeedsWebsite` — specific reason this business would benefit
  - `whatsMissingOnline` — what's absent from their online presence
  - `opportunities` — array of specific opportunity strings

**Generated Content** *(produced by generator and outreach services)*
- `generatedWebsiteCode` — complete single-file HTML website
- `outreach` — structured object:
  - `email.subject` / `email.body`
  - `callScript.opener` / `callScript.valueProposition` / `callScript.objectionHandlers` / `callScript.close`

**Deployment** *(set by GitHub/Vercel services)*
- `githubUrl` — URL of the file in the GitHub repo
- `deployedUrl` — live Vercel URL

**CRM** *(managed manually via the UI)*
- `leadStatus` — `new` → `qualified` → `contacted` → `interested` → `closed` / `rejected`
- `priority` — `high` / `medium` / `low`
- `priorityScore` — 0–100 integer (calculated by lead scorer)
- `notes` — free-text notes
- `lastContactedAt` — ISO timestamp (nullable)

### Lead Scoring

The lead scorer runs automatically after each scrape. It calculates a 0–100 score based on:

| Rule | Points |
|---|---|
| No website | +40 |
| No reviews | +20 |
| Low rating (< 3.5) | +15 |
| Phone number available | +10 |
| Description available | +5 |
| Rating between 3.5–4.5 | +5 |

Score thresholds:
- **55–100** → `high` priority
- **25–54** → `medium` priority
- **0–24** → `low` priority

---

## Storage Layer

### Switching backends

Set `STORAGE_BACKEND` in `.env`:

```env
STORAGE_BACKEND=postgres   # use PostgreSQL (recommended for production)
STORAGE_BACKEND=csv        # use CSV file (local dev / no DB setup)
```

### PostgreSQL (recommended)

- Hosted on [Neon](https://neon.tech) (free tier available)
- Schema defined in `backend/src/data/schema.ts` using Drizzle ORM
- Two tables: `businesses`, `scrape_sessions`
- Setup: `npm run db:push` (creates tables directly from schema)
- Survives server redeploys — DB is independent of the app server

### CSV (fallback)

- Stored at `backend/src/data/storage/businesses.csv`
- Atomic writes: written to `.tmp` first, then renamed
- Nested objects (keywords, insights, outreach) JSON-serialised in their column
- Every row validated against Zod schema on read; corrupt rows are skipped
- Not suitable for hosted deployments — file is on the server filesystem

---

## Scraper

### What it does

The scraper automates a Chromium browser to navigate Google Maps and extract business data. The search term is a free-form string — any location descriptor Google Maps understands works.

### How it avoids detection

- Blocks images, fonts, and media requests (keeps CSS — Maps needs it to render)
- Uses a realistic desktop user agent string
- Random delay (1–3 seconds) between each business visit
- Sequential processing only — no parallel requests (p-queue with concurrency = 1)
- Retry logic with exponential backoff on failures

### Key design decisions

**Pre-collect pattern**: All visible card data (name, rating, category, description) is scraped in one pass *before* clicking any listing. Clicking a listing and coming back causes the DOM to re-render, which shifts card indices. By collecting names first, we click each listing by name, not by position.

**Re-navigate instead of goBack**: Google Maps detail panels don't push to browser history, so `page.goBack()` goes to `about:blank`. After each listing, the scraper navigates back to the original search URL directly.

**Deduplication**: Two in-memory indexes are loaded from storage at session start — one for phone numbers, one for name+address pairs. Every scraped business is checked against both. Works across sessions and across different search strategies targeting the same area.

**Batch mode**: Multiple category searches can be queued for the same target. Each runs as an independent Maps session. The deduplicator reloads from storage at the start of each session, so businesses found in session 1 are skipped in sessions 2–N.

### Scraper API

```
POST /api/scraper/start         — { zipcode, category?, maxResults? }
POST /api/scraper/batch         — { zipcode, categories[], maxResults? }
POST /api/scraper/stop          — stops running session + clears batch queue
GET  /api/scraper/status        — session state + batch progress
GET  /api/scraper/batch-progress — batch queue state only
GET  /api/scraper/history       — all past sessions, newest first
GET  /api/scraper/history/:id   — full session detail (savedList/skippedList/errorList/foundNames)
GET  /api/scraper/zipcodes      — zipcode index (sessions, totalSaved, lastScrapedAt)
```

---

## API Reference

### Scraper
| Method | Path | Description |
|---|---|---|
| POST | `/api/scraper/start` | Start a single search session |
| POST | `/api/scraper/batch` | Queue multi-category batch |
| POST | `/api/scraper/stop` | Stop session + clear queue |
| GET | `/api/scraper/status` | Poll session + batch progress |
| GET | `/api/scraper/history` | All past sessions |
| GET | `/api/scraper/history/:id` | Session detail with full lists |
| GET | `/api/scraper/zipcodes` | Zipcode coverage index |

### Businesses
| Method | Path | Description |
|---|---|---|
| GET | `/api/businesses` | List with filter/sort/search/pagination |
| GET | `/api/businesses/stats` | Pipeline summary |
| GET | `/api/businesses/:id` | Single business profile |
| PATCH | `/api/businesses/:id/status` | Update lead status |
| PATCH | `/api/businesses/:id/notes` | Update notes |
| PATCH | `/api/businesses/:id/contacted` | Update last contacted date |
| DELETE | `/api/businesses/:id` | Hard delete |

### AI Processing
| Method | Path | Description |
|---|---|---|
| POST | `/api/businesses/:id/analyze` | Run keywords + summary + insights |
| POST | `/api/businesses/:id/website` | Generate website |
| GET | `/api/businesses/:id/website` | Return generated code |

### Deployment *(coming)*
| Method | Path | Description |
|---|---|---|
| POST | `/api/businesses/:id/deploy` | Push to GitHub + deploy to Vercel |
| GET | `/api/businesses/:id/deployment` | Return deployment status + URLs |

### Outreach *(coming)*
| Method | Path | Description |
|---|---|---|
| POST | `/api/businesses/:id/outreach` | Generate email + call script |
| GET | `/api/businesses/:id/outreach` | Return stored outreach content |

---

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Storage backend
STORAGE_BACKEND=postgres    # postgres | csv
DATABASE_URL=postgres://... # required when STORAGE_BACKEND=postgres

# LLM — which provider to use by default
LLM_PROVIDER=deepseek       # deepseek | claude | openai

# DeepSeek API key (get from your LLM provider)
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://integrate.api.nvidia.com/v1
DEEPSEEK_MODEL=deepseek-ai/deepseek-v3.2

# Anthropic Claude (optional if not using claude)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6

# OpenAI (optional if not using openai)
OPENAI_API_KEY=sk-...

# GitHub (required for deployment features)
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your-username
GITHUB_REPO=local-business-sites

# Vercel (required for deployment features)
VERCEL_TOKEN=...
VERCEL_TEAM_ID=...           # optional, only for team accounts
```

---

## Project Structure

```
local-business-finder/
├── PLAN.md                          — Build plan with step progress
├── DOCUMENTATION.md                 — This file
├── USER_STORY.md                    — End-to-end usage walkthrough
├── .env                             — Environment variables (not committed)
│
├── backend/
│   ├── drizzle.config.ts            — Drizzle ORM config (points to schema + Neon)
│   ├── drizzle/                     — Generated migration SQL files
│   └── src/
│       ├── index.ts                 — Entry point, server startup
│       ├── app.ts                   — Express app, route registration
│       ├── config/
│       │   ├── env.ts               — Zod env validation (exits on bad config)
│       │   └── index.ts             — Structured config object
│       ├── types/
│       │   ├── business.types.ts    — Business schema + TypeScript types
│       │   └── api.types.ts         — API request/response shapes
│       ├── data/
│       │   ├── schema.ts            — Drizzle schema (businesses + scrape_sessions tables)
│       │   ├── repository.interface.ts  — IBusinessRepository interface
│       │   ├── repository.factory.ts    — Returns active implementation
│       │   ├── csv.repository.ts        — CSV implementation
│       │   ├── postgres.repository.ts   — PostgreSQL implementation (Drizzle + Neon)
│       │   └── migrate.ts               — Migration runner script
│       ├── services/
│       │   ├── scraper/
│       │   │   ├── browser.manager.ts        — Playwright lifecycle
│       │   │   ├── maps.navigator.ts         — Search, scroll, click, navigate
│       │   │   ├── maps.extractor.ts         — Card + detail extraction
│       │   │   ├── scraper.service.ts        — Session orchestrator + batch queue
│       │   │   ├── scraper.types.ts          — ScraperState, BatchJob types
│       │   │   ├── scrape.history.ts         — JSON file history (CSV backend)
│       │   │   └── scrape.history.postgres.ts — DB history (Postgres backend)
│       │   ├── llm/
│       │   │   ├── llm.interface.ts     — ILLMProvider, LLMRequest/Response
│       │   │   ├── llm.factory.ts       — Creates the correct adapter
│       │   │   ├── llm.config.ts        — Task → provider routing
│       │   │   ├── llm.service.ts       — Orchestrator (single entry point)
│       │   │   └── adapters/
│       │   │       ├── deepseek.adapter.ts
│       │   │       ├── claude.adapter.ts
│       │   │       └── openai.adapter.ts
│       │   ├── ai/
│       │   │   └── ai.service.ts        — Keywords, summary, insights
│       │   ├── lead/
│       │   │   ├── lead.scorer.ts       — 0–100 scoring, priority assignment
│       │   │   └── lead.service.ts      — Status transitions, notes, stats
│       │   └── website/
│       │       └── website.generator.ts — AI website generation
│       ├── routes/
│       │   ├── scraper.routes.ts        — Scraper endpoints
│       │   ├── businesses.routes.ts     — Business CRUD + lead endpoints
│       │   ├── analysis.routes.ts       — AI processing endpoints
│       │   └── website.routes.ts        — Website generation endpoints
│       ├── middleware/
│       │   ├── validate.middleware.ts   — Zod body validation
│       │   ├── error.middleware.ts      — Global error handler
│       │   └── logger.middleware.ts     — Request logging
│       └── utils/
│           ├── logger.ts               — Winston logger
│           └── deduplicator.ts         — Phone + name/address indexes
│
└── frontend/
    └── src/
        ├── main.tsx                — App entry point
        ├── App.tsx                 — Router + layout
        ├── types/
        │   └── business.ts         — Frontend types + UI helper maps
        ├── pages/
        │   ├── Dashboard.tsx       — Stats + scraper control (single + batch)
        │   ├── Businesses.tsx      — Business list with filters
        │   ├── BusinessDetail.tsx  — Full business profile (6 tabs)
        │   └── ScraperHistory.tsx  — Session history + profile viewer
        ├── hooks/
        │   └── useBusinesses.ts    — TanStack Query hooks
        └── lib/
            └── api.ts              — Axios instance + API client
```

---

## Build Progress

| Section | Status |
|---|---|
| Section 1 — Foundation | Complete |
| Section 2 — Data Layer (CSV + PostgreSQL) | Complete |
| Section 3 — Scraper (single + batch + history) | Complete |
| Section 4 — LLM Layer | Complete |
| Section 5 — AI Processing | Complete |
| Section 6 — Lead Management | Complete |
| Section 7 — Website Generation | Complete |
| Section 8 — Integrations (GitHub/Vercel) | Pending |
| Section 9 — Outreach | Pending |
| Section 10 — Frontend UI | Mostly complete (deployment UI pending) |
