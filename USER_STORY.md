# Local Business Finder — User Story

*A walkthrough of the complete application from first run to closed deal.*

---

## The Scenario

You want to find local businesses in Sugar Land, TX (zipcode **77477**) that don't have a website. You'll scrape them across multiple category searches, enrich their profiles with AI, generate websites for the best leads, deploy those sites live, and reach out with personalized copy.

---

## Act 1 — Discovery (Scraper)

### You open the dashboard

The frontend loads at `http://localhost:5173`. You see:
- A stats bar at the top: **0 businesses**, **0 no-website**, **0 deployed**, **0 hot leads**
- A scraper control panel with two modes: Single Search and Batch

---

### Option A — Single search

You type `77477`, pick `nail salons` from the searchable category dropdown, set max results to `20`, and hit **Start Scraper**.

The frontend calls `POST /api/scraper/start`:
```json
{ "zipcode": "77477", "category": "nail salons", "maxResults": 20 }
```

---

### Option B — Batch mode (recommended for full coverage)

You switch to **Batch** mode. You type `77477`, search the category list and select: nail salons, hair salons, restaurants, auto repair, plumbers, electricians, dentists, and 20 more. You set max results to `20`.

The frontend calls `POST /api/scraper/batch`:
```json
{
  "zipcode": "77477",
  "categories": ["nail salons", "hair salons", "restaurants", "auto repair", ...],
  "maxResults": 20
}
```

The server queues all 28 sessions. They run one at a time, automatically.

---

### Behind the scenes — one session runs

**1. Browser launches**
Playwright opens a headless Chromium window. Images, fonts, and media are blocked.

**2. Navigate to Google Maps**
The scraper builds the search URL:
```
https://www.google.com/maps/search/nail+salons+near+77477
```

**3. Scroll to load cards**
The sidebar is scrolled until 20 cards are loaded or no new cards appear after 3 consecutive scrolls.

**4. Pre-collect card data**
Before clicking anything, every visible card is read in one pass:
```
Card 0: "Lucky Nail Spa"     — 4.1★ — Nail salon — "Walk-ins welcome"
Card 1: "Elegant Nails"      — 3.9★ — Nail salon — no description
Card 2: "Queen Nails"        — 4.4★ — Nail salon — "Best gel in Sugar Land"
...
```

**5. Process each card**
For "Lucky Nail Spa":
- Click the listing by name → detail panel opens
- Extract: phone `(281) 555-0192`, address `12345 Dairy Ashford Rd`, website: **none**, 47 reviews
- Check deduplicator: not seen before → save
- Lead score:
  - No website → +40
  - Has phone → +10
  - Has description → +5
  - Rating 4.1 → +5
  - **Score: 60 → priority: high**
- Save to database, register in deduplicator, re-navigate to results, wait 1–3 seconds

---

### You watch batch progress

While the batch runs, the dashboard shows two progress bars:

```
Batch: 3/28 jobs — 77477               11%
[████░░░░░░░░░░░░░░░░░░░░░░░░]

Currently: hair salons
Next: restaurants, auto repair, plumbers +24 more

Scraping 77477 — hair salons            65%
[███████████████████████░░░░░]
Found: 17  Saved: 8  Skipped: 3  Errors: 0
```

When a session finishes, the next one starts automatically. Businesses found in earlier sessions are skipped as duplicates in later ones — no manual deduplication needed.

---

### Batch finishes

After all 28 sessions complete:
```
28/28 jobs done
Total saved: ~280 businesses (across all categories, after deduplication)
```

---

## Act 2 — Reviewing Session Results

### You open the History page

Click **History** in the nav. Two views:

**Zipcodes tab:**
```
Zipcode    Sessions    Total Saved    Last Scraped
77477      28          284            Mar 21, 2026
```

**Sessions tab:**
Each session row shows found/saved/skipped/errors. Click to expand:

**Saved tab** — full contact profiles:
```
Lucky Nail Spa
12345 Dairy Ashford Rd
📞 (281) 555-0192  [Copy]
                          high (60)  No website
```

**Errors tab** — businesses that failed extraction:
```
Sunrise Beauty — "Failed to open listing panel"
                                      [Search Maps →]
```
You can click "Search Maps →" to look them up manually for outreach.

**Found tab** — all business names collected:
```
Lucky Nail Spa  ↗    Queen Nails  ↗    Elegant Nails  ↗
Pink Nail Salon ↗    ...
```
Each has a Maps link for manual lookup.

---

## Act 3 — AI Enrichment

### You open a business profile

Click "Lucky Nail Spa" in the saved list. The detail page opens with 6 tabs:

```
Overview | Insights | Website | Outreach | CRM | Deployment
```

**Overview tab:**
```
Name:        Lucky Nail Spa
Address:     12345 Dairy Ashford Rd, Sugar Land, TX 77477
Phone:       (281) 555-0192
Category:    Nail salon
Rating:      4.1★ (47 reviews)
Website:     None
Priority:    HIGH (score: 60)
Lead Status: New
```

### You click "Analyze"

The backend runs three LLM tasks in sequence:

1. **Keywords** — 8 local SEO keywords for the business
2. **Summary** — 2–3 sentence context for outreach
3. **Insights** — why they need a website, what's missing, specific opportunities

The Insights tab fills in:
```
Why they need a website:
Lucky Nail Spa has 47 reviews and a 4.1-star rating but no website,
meaning they're invisible to customers searching online for nail salons...

Opportunities:
  ✦ Capture "nail salon near me" searches in 77477
  ✦ Display services and pricing
  ✦ Enable online booking
  ✦ Showcase nail art photos
  ✦ Collect customer emails for promotions
```

---

## Act 4 — Website Generation

### You click "Generate Website"

The LLM generates a complete single-file HTML website — fully styled nail salon site with:
- Hero section with business name and tagline
- Services + pricing section
- Contact section with phone and address
- Mobile-responsive Tailwind CSS layout
- SEO meta tags using the generated keywords

The Website tab shows a live iframe preview and the raw HTML.

---

## Act 5 — Deployment *(coming)*

### You click "Deploy"

1. Backend pushes `businesses/lucky-nail-spa-77477/index.html` to GitHub
2. Vercel deploys it instantly

```
deployedUrl: https://lucky-nail-spa-77477.vercel.app
```

The dashboard stats update: **1 deployed**.

---

## Act 6 — Outreach

### You click "Generate Outreach"

**Email:**
```
Subject: We built a free website for Lucky Nail Spa

Hi,

I was searching for nail salons in Sugar Land and found Lucky Nail Spa —
47 reviews and a 4.1-star rating is impressive. I noticed you don't have
a website, which means customers searching online can't find your services
or book an appointment.

I built a website for you. It's live right now:
https://lucky-nail-spa-77477.vercel.app

No strings attached — it's yours to keep...
```

**Call Script:**
```
Opener:
"Hi, is this Lucky Nail Spa? My name is [name]. I was searching for nail
salons in Sugar Land and found your Google listing — great reviews. I just
built a website for you and wanted to make sure you saw it."

Value Proposition:
"Right now when someone searches 'nail salon near me' in 77477, they can't
find your services or hours online. The site I built shows your services,
contact info, and has a booking section ready to add your scheduling link."
```

---

## Act 7 — CRM Management

### You update the lead status

After calling, you go to the **CRM tab**:
- Change status: `New` → `Contacted`
- Add note: "Called 21 Mar. Owner interested, wants to see the site. Following up."
- Set last contacted date to today

### Two days later

Status → `Interested`. Add note: "Wants booking link added + custom domain."

### Deal closed

Status → `Closed`.

---

## The Full Pipeline

```
Search target (zipcode, neighborhood, intersection, etc.)
    │
    ▼
[Batch Scraper] — 28 category searches × 20 results → ~280 businesses
    │            — deduplication across all sessions
    ▼
[Lead Scorer] — auto-scores on save → high / medium / low priority
    │
    ▼
[History Viewer] — review saved/skipped/error/found lists
    │              — copy phone numbers for manual outreach
    │
    ▼
[AI Analysis] — per business, on demand
    │  keywords → summary → insights
    │
    ▼
[Website Generator] — complete HTML website
    │
    ▼
[Deployment] — GitHub → Vercel → live URL
    │
    ▼
[Outreach Generator] — personalized email + call script
    │
    ▼
[CRM] — status, notes, last-contacted
    │
    ▼
Closed deal
```

---

## Running the Application

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Validates env vars at startup, exits clearly on misconfiguration

# Terminal 2 — Frontend
cd frontend
npm run dev
# App opens at http://localhost:5173
```

### Setting up PostgreSQL (recommended)

```bash
# 1. Create a free Neon database at neon.tech, copy the connection string

# 2. Add to backend/.env:
STORAGE_BACKEND=postgres
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# 3. Create the tables:
cd backend
npm run db:push

# 4. Start the server — it now reads/writes to Postgres
npm run dev
```

### API examples

```bash
# Single search
curl -X POST http://localhost:3001/api/scraper/start \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "77477", "category": "nail salons", "maxResults": 20}'

# Batch search
curl -X POST http://localhost:3001/api/scraper/batch \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "77477", "categories": ["nail salons", "restaurants", "auto repair"], "maxResults": 20}'

# Poll status
curl http://localhost:3001/api/scraper/status
```

---

## Important Note on Scraping

The Google Maps scraper uses conservative pacing (random 1–3 second delays, sequential requests, no parallel scraping) to minimize load on Google's servers. This tool is for personal, non-commercial research use only. Use responsibly.
