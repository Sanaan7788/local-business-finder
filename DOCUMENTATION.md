# Local Business Finder

A personal internal tool that finds local businesses without a good online presence, enriches each one with AI, generates a single-file website for it, and tracks the lead through a small CRM pipeline.

---

## What it does

1. **Scrape** — give it a location (zipcode, address, neighbourhood, landmark, coordinates, or a Google Maps link) and optionally one or many categories. Playwright drives Google Maps, reads every listing card, opens each listing, and saves name, phone, address, rating, review count, review snippets, menu (restaurants), and whether the business has a website. Batch mode queues one session per category. Every session deduplicates against everything already stored (phone, then name+address).
2. **Score** — each business gets a 0–100 lead score and a high/medium/low priority (no website, no reviews, low rating, no description).
3. **Enrich with AI** — keywords (grouped), summary, industry context, insights, a content brief (confirmed facts vs assumptions), and, when the business already has a site, a crawl-based website analysis with a 1–10 score, improvement list, and any email addresses found. A personalised outreach email can be generated from the improvements. Menu photos can be turned into structured menu items with Claude vision.
4. **Generate a website** — a self-contained single-file HTML site built from a saved, editable prompt.
5. **Track** — lead status (new → shortlisted → contacted → interested → closed / rejected), notes, and token spend per business and overall.

Two other ways in besides scraping: paste a single Google Maps listing URL, or import a business from its own website URL (the site is fetched, the basics extracted, and the full AI analysis runs).

---

## Architecture

```
frontend/  React 19 + Vite + Tailwind + TanStack Query      → /api/* (Vite proxy in dev)
backend/   Express + TypeScript
           ├── routes/         thin handlers; asyncHandler + typed AppErrors
           ├── services/
           │   ├── scraper/    Playwright: browser manager, Maps navigator/extractor, session orchestrator, history
           │   ├── llm/        provider table + one OpenAI-compatible adapter + Claude adapter
           │   ├── ai/         prompt builders/parsers, AIService
           │   ├── lead/       scoring, status transitions, business factory
           │   └── website/    crawler, analyzer, prompt builder, generator
           ├── data/           Drizzle schema, Postgres repository, migrations
           └── config/         Zod-validated env → typed config
```

**Storage** is Postgres on Neon (HTTP driver) via Drizzle ORM. Two tables: `businesses` and `scrape_sessions`.

---

## Running it

```bash
# one-time
cd backend && npm install && cp .env.example .env   # then fill in DATABASE_URL + one LLM key
cd ../frontend && npm install
cd .. && npm install                                 # root: just `concurrently`

# every day
npm run dev        # backend on PORT (default 3001), frontend on 5173
```

The Vite dev proxy in `frontend/vite.config.ts` forwards `/api` to the backend port; keep it in sync with `PORT` in `backend/.env`.

### Static snapshot on GitHub Pages

The frontend has a second build target that runs without the backend: `vite build --mode static` reads a JSON snapshot from `frontend/public/data` instead of `/api`, and `.github/workflows/deploy-pages.yml` publishes it to `https://sanaan7788.github.io/local-business-finder/` on every push to `main` that touches `frontend/`. The repo is public, so everything in the snapshot is public.

```bash
npm run export:static     # Neon → frontend/public/data (index.json, businesses/<id>.json, sessions.json); add -- --no-notes to leave CRM notes out
npm run build:static      # type-check + vite build --mode static + 404.html SPA fallback → frontend/dist
npm run preview:static    # serve the static build locally at /local-business-finder/
# commit frontend/public/data and push main → Actions deploys in a minute or two
```

What the static site can do: browse, search, filter and sort businesses; open every profile tab; move leads between statuses (shortlist / reject / contacted / …) and write notes. Those edits live in that browser's localStorage (`lbf:changes`), merged over the snapshot on read. **Local changes** in the header exports them as a JSON file; apply it to the database with:

```bash
npm run import:changes -- ~/Downloads/lbf-changes-2026-09-05.json --dry-run   # preview
npm run import:changes -- ~/Downloads/lbf-changes-2026-09-05.json             # apply; --force overrides conflicts
npm run export:static && git add frontend/public/data && git commit -m "Refresh snapshot" && git push
```

What it cannot do (no server): scraping, re-scrape, URL imports, every AI call (analysis, brief, website prompt/site, crawl, outreach, menu photos), profile edits, deletes, LLM switching. Those controls are hidden in the static build (`IS_STATIC` in `frontend/src/lib/env.ts`, `<ServerOnly>`); the data layer swap lives in `frontend/src/lib/api/index.ts` and `frontend/src/lib/api/static/`.

### Environment variables (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `PORT`, `NODE_ENV` | no | defaults 3001 / development |
| `LLM_PROVIDER` | no | `deepseek` (default) · `claude` · `openai` · `gemini` · `mistral` · `groq` |
| `<PROVIDER>_API_KEY` | active provider only | `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY` |
| `CLAUDE_MODEL` | no | any Anthropic model id, default `claude-sonnet-4-6` |
| `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` | no | NVIDIA NIM endpoint + model |
| `SCRAPER_DEBUG` | no | `true` opens a visible Chromium window |

Only the active provider's key is checked at boot. Any other configured provider can be switched to from the navbar at runtime (the choice lives in memory on the backend and is re-applied by the frontend after a restart). Menu extraction from images always uses Claude, so `ANTHROPIC_API_KEY` is needed for that feature.

### Database

`backend/src/data/schema.ts` is the source of truth; `backend/drizzle/` holds the generated migrations.

- **Existing database** (this project's Neon DB is shared with other projects): `npm run db:push` applies schema differences for this app's two tables only — `drizzle.config.ts` scopes drizzle-kit with `tablesFilter`, so it never touches other tables. Review the printed statements before confirming.
- **Fresh database**: `npm run db:migrate` applies `drizzle/0000…0004` in order.
- **Schema change**: edit `schema.ts`, run `npm run db:generate`, review the new SQL file, then push or migrate.

---

## API

All responses are `{ success: true, data }` or `{ success: false, error, fields? }`. Errors are typed on the backend (`NotFoundError` 404, `ValidationError` 400, `UnprocessableError` 422, `ConflictError` 409, `UpstreamError` 502); anything else is a 500 with a generic message.

### Scraper — `/api/scraper`
| Method | Path | Purpose |
|---|---|---|
| POST | `/start` | `{ zipcode, category?, maxResults? }` — queue one session (202) |
| POST | `/batch` | `{ zipcode, categories[], maxResults? }` — queue one session per category (202) |
| POST | `/stop` | stop the running session and clear the queue |
| GET | `/status` | live session state + batch progress (polled while running) |
| POST | `/lookup-maps-url` | `{ mapsUrl }` — save one business from a Maps listing URL (sync) |
| POST | `/import-url` | `{ websiteUrl }` — save a business from its own site and run the AI analysis (sync) |
| GET | `/history` | past sessions, newest first (counts only) |
| GET | `/history/:id` | one session with saved / skipped / error / found lists |

Only one browser flow runs at a time; starting another returns 409.

### Businesses — `/api/businesses`
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | list (light projection) — `search, leadStatus, priority, hasWebsite, category, zipcode, page, pageSize, sortField, sortOrder` |
| GET | `/stats` | pipeline totals by status and priority |
| GET | `/categories` | distinct categories with counts |
| POST | `/` | create a stub business by hand |
| GET | `/:id` | full profile |
| PATCH | `/:id/profile` | edit discovered fields (rescored) |
| PATCH | `/:id/status` | lead status transition |
| PATCH | `/:id/notes` | CRM notes |
| PATCH | `/:id/website-prompt` | save / clear the editable website prompt |
| DELETE | `/:id` | hard delete |

### AI + website — `/api/businesses/:id/…`
| Method | Path | Purpose |
|---|---|---|
| POST | `/analyze` | keywords → summary → context → insights → content brief |
| POST | `/content-brief` | regenerate the brief only |
| POST | `/website-analysis` | crawl the existing site (≤10 pages) and analyse it |
| PATCH | `/website-analysis` | edit the structured analysis / improvements |
| POST | `/outreach-email` | personalised cold email from the improvements |
| POST | `/menu-from-images` | multipart `images[]` (≤10) → menu sections via Claude vision |
| POST | `/rescrape` | refresh scraped fields from the stored Maps URL |
| POST | `/website-prompt/generate` | build and save the default website prompt |
| POST | `/website` | generate the site from the saved prompt (or the default) |

### Settings — `/api/settings`
`GET /llm`, `POST /llm { provider }`, `GET /stats` (total tokens).

`GET /api/health` is a liveness check.

---

## Data model

`Business` (backend `src/types/business.types.ts`, mirrored in `frontend/src/types/business.ts`):

- **Identity** `id`, `createdAt`, `updatedAt`
- **Discovery** `name`, `phone`, `address`, `zipcode` (the search target used), `category`, `description`, `website`, `websiteUrl`, `rating`, `reviewCount`, `googleMapsUrl`
- **Scraper extras** `reviewSnippets[]`, `menu[]` (`{ section, items[{ name, price, description }] }`), `scrapedEmails[]`
- **AI outputs** `keywords[]`, `keywordCategories` (`serviceKeywords`, `locationKeywords`, `reputationKeywords`, `searchPhrases`), `summary`, `businessContext`, `insights` (`whyNeedsWebsite`, `whatsMissingOnline`, `opportunities[]`), `contentBrief` (`confirmedFacts`, `assumptions`, `generatedAt`)
- **Generated** `websitePrompt`, `generatedWebsiteCode`, `websiteAnalysis` (`crawledAt`, `pagesVisited`, `rawPages[]`, `structured`, `improvements[]`, `score`, `scoreReason`), `outreach.email` (`subject`, `body`)
- **CRM** `leadStatus`, `priority`, `priorityScore`, `notes`, `lastContactedAt`, `tokensUsed`

List endpoints return `BusinessListItem`, the same record without the text/JSON blobs.

### Lead scoring (`services/lead/lead.scorer.ts`)
No website +40 · no reviews +20 · rating < 3.5 +15 · no description +10 · fewer than 10 reviews +10 · strong presence (site, ≥4.5, >100 reviews) −15. Score ≥55 → high, ≥25 → medium, else low.

### Status transitions (`services/lead/lead.service.ts`)
new → shortlisted / rejected · shortlisted → new / contacted / rejected · contacted → interested / rejected / shortlisted · interested → closed / rejected / contacted · rejected → new · closed is final.

---

## Scraper notes

- Cards are read first, then each listing is opened by URL (falling back to clicking by name) — opening a listing re-renders the list and shifts indices.
- Images, media and fonts are blocked; CSS stays because Maps needs it to render.
- Random 2–5 s pauses between listings; three retries with exponential backoff per listing. A listing that still fails is recorded as an error and a stub profile with the name is created so it is not lost.
- `Stop` closes the browser immediately so the current listing aborts instead of finishing.
- The LLM keyword step runs for every saved business during the scrape; the session's token count is stored with its history row.

---

## LLM providers

`services/llm/llm.config.ts` holds one row per provider (label, model, base URL, key). Five providers speak the OpenAI chat protocol and share `OpenAICompatibleAdapter`; Claude uses the Anthropic SDK and is the only adapter with image input. Both SDKs retry rate limits and transient errors and time out after 120 s. Adding a provider that speaks the OpenAI protocol is one table row.

---

## Frontend

- **Theme**: CSS variables in `src/index.css` mapped to semantic Tailwind colours (`bg-surface`, `text-fg-muted`, `border-line`, …). Status hues (`info/success/warning/danger/purple`) live in `src/lib/tones.ts`, the only file with raw palette colours. Dark mode is a class on `<html>`, applied before first paint by the inline script in `index.html`.
- **UI kit** in `src/components/ui/` (Button, Card, Badge, Alert, Panel, Tabs, Popover, StatTile, ProgressBar, Field, EmptyState, ErrorState, Spinner, CopyButton, EditableField).
- **Data**: `src/hooks/queryKeys.ts` is the only place query keys are spelled out; mutations invalidate exactly the groups they affect. Scraper status is polled only while a scrape runs; when it finishes, lists, stats, history and the token counter refresh on any page.
- **Pages** are directories (`pages/Dashboard/`, `pages/Businesses/`, `pages/BusinessDetail/`, `pages/ScraperHistory/`) loaded lazily. The Businesses list keeps its filters, sort and page in the URL.

---

## Project layout

```
backend/
  .env.example              all variables with placeholders
  drizzle.config.ts         drizzle-kit, scoped to this app's tables
  drizzle/                  migrations 0000–0004 + snapshots
  src/
    index.ts, app.ts        boot + graceful shutdown, Express app
    config/                 env.ts (Zod) → index.ts (typed config)
    data/                   schema.ts, repository.interface.ts, repository.factory.ts, postgres/, migrate.ts
    middleware/             async.handler, validate, logger, error
    routes/                 health, scraper, businesses, analysis, website, settings
    services/               scraper/, llm/, ai/, lead/, website/
    scripts/                export-static.ts (snapshot for GitHub Pages), import-changes.ts (apply exported local edits)
    types/                  business.types.ts (Zod schemas + inferred types)
    utils/                  errors.ts, logger.ts, deduplicator.ts
frontend/
  src/
    components/ui/          design-system primitives
    components/layout/      header, theme toggle, LLM selector, token counter, scrape pill
    hooks/                  query keys, queries/mutations, small UI hooks
    lib/                    api client (+ api/static/: snapshot + localStorage overlay for the Pages build), env, formatting, tones, leads, urls
    ../public/data/         exported snapshot served by the static build (committed)
    pages/                  one directory per page
    types/                  business.ts, scraper.ts, api.ts
```
