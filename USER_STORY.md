# Local Business Finder — User Story

*A walkthrough of the complete application from first run to closed deal.*

---

## The Scenario

You want to find local businesses in zipcode **10001** (Manhattan) that don't have a website. You'll scrape them, enrich their profiles with AI, generate websites for the best leads, deploy those sites live, and reach out with personalized copy.

---

## Act 1 — Discovery (Scraper)

### You open the dashboard

The frontend loads at `http://localhost:5173`. You see:
- A stats bar at the top: **0 businesses**, **0 no-website**, **0 deployed**, **0 hot leads**
- A scraper control panel: zipcode input, category dropdown, max results slider
- An empty business table below

Everything is zero. The CSV file doesn't exist yet.

---

### You start a scrape

You type `10001` into the zipcode field, select `restaurants` from the category dropdown, set max results to `20`, and hit **Start Scraper**.

The frontend calls `POST /api/scraper/start` with:
```json
{ "zipcode": "10001", "category": "restaurants", "maxResults": 20 }
```

The server responds immediately with `202 Accepted`. The scrape runs in the background.

---

### Behind the scenes — the scraper runs

**1. Browser launches**
Playwright opens a headless Chromium window. Images, fonts, and media are blocked to speed things up. A realistic desktop user agent is set.

**2. Navigate to Google Maps**
The scraper builds the URL:
```
https://www.google.com/maps/search/restaurants+near+10001
```
It waits for the results sidebar to load.

**3. Scroll to load cards**
The scraper scrolls the sidebar repeatedly, waiting for new cards to appear. It stops when 20 cards are loaded or 3 consecutive scrolls find nothing new.

**4. Pre-collect card data**
Before clicking anything, the scraper reads every visible card in one pass:
```
Card 0: "Joe's Pizza"         — 4.2★ — Pizza — "Best slice in NYC"
Card 1: "Midtown Diner"       — 3.8★ — American — no description
Card 2: "Spice Garden"        — 4.5★ — Indian — "Authentic flavors"
... (17 more)
```

**5. Process each card one by one**
For "Joe's Pizza":
- Click the listing by name → detail panel opens
- Extract: phone `(212) 555-1234`, address `123 W 32nd St`, website: **none**, 84 reviews
- Check deduplicator: phone not seen before, name+address not seen before → **not a duplicate**
- Run lead scorer:
  - No website → +40
  - Has phone → +10
  - Has description → +5
  - Rating 4.2 → +5
  - **Score: 60 → priority: high**
- Build the full Business record with a UUID, save to CSV
- Re-navigate back to search results
- Wait a random 1–3 seconds

This repeats for all 20 cards.

---

### You watch the scraper progress

While the scraper runs, the frontend polls `GET /api/scraper/status` every 3 seconds:

```
Running: true
Found: 20
Saved: 7     ← only businesses without websites
Skipped: 2   ← duplicates from a previous session
Errors: 0
```

The progress bar fills. The business table starts populating with rows as businesses are saved.

---

### Scrape finishes

The scraper closes the browser and marks the session complete:

```
Found: 20 | Saved: 7 | Skipped: 2 | Errors: 0
```

The dashboard stats update:
- **7 businesses** discovered
- **7 no-website** (100% — that was the filter)
- **3 high priority** leads

The business table now shows 7 rows. Each row has: name, category, address, rating, priority badge, lead status `new`.

---

## Act 2 — Enrichment (AI Processing)

### You open a business profile

You click "Joe's Pizza" in the table. The detail page opens with 6 tabs:

```
Overview | Insights | Website | Outreach | CRM | Deployment
```

**Overview tab** shows:
```
Name:        Joe's Pizza
Address:     123 W 32nd St, New York, NY 10001
Phone:       (212) 555-1234
Category:    Pizza
Rating:      4.2★ (84 reviews)
Website:     None
Priority:    HIGH (score: 60)
Lead Status: New
```

Everything is raw scraped data. The AI fields are empty.

---

### You click "Analyze"

The frontend calls `POST /api/business/{id}/analyze`.

The backend runs three LLM tasks in sequence through `LLMService`:

**Task 1: keywords**
```
System: You are a local SEO specialist.
User:   Generate 8 SEO keywords for a pizza restaurant called "Joe's Pizza"
        located at 123 W 32nd St, New York, NY 10001.
        Description: "Best slice in NYC"
        Return JSON: { "keywords": ["...", ...] }
```

Response:
```json
{
  "keywords": [
    "pizza near me", "best pizza Manhattan", "NYC pizza slice",
    "Joe's Pizza 10001", "midtown pizza", "New York pizza restaurant",
    "pizza delivery 10001", "affordable pizza NYC"
  ]
}
```

**Task 2: summary**
```
System: You write concise business summaries for outreach.
User:   Write a 2-3 sentence summary for "Joe's Pizza"...
```

Response:
```
Joe's Pizza is a well-loved pizza spot in Midtown Manhattan with 84 reviews
and a 4.2-star rating. Known for their classic New York slice, they've built
a loyal local following but currently have no web presence to capture online
orders or new customers searching nearby.
```

**Task 3: insights**
```
System: You are a digital marketing consultant.
User:   Analyze why "Joe's Pizza" needs a website...
        Return JSON: { "whyNeedsWebsite": "...", "whatsMissingOnline": "...", "opportunities": [...] }
```

Response:
```json
{
  "whyNeedsWebsite": "Joe's Pizza has 84 reviews and a 4.2-star rating but no website, meaning they're losing customers who search online for pizza in Midtown and can't find a menu or order link.",
  "whatsMissingOnline": "No website means no Google Business menu integration, no online ordering capability, and no way for customers to find their hours or location outside of Google Maps.",
  "opportunities": [
    "Capture 'pizza near me' searches in the 10001 area",
    "Display the menu and daily specials",
    "Add an online ordering or reservation link",
    "Show photos of the food to attract new customers",
    "Collect customer emails for promotions"
  ]
}
```

---

### The Insights tab populates

```
Why they need a website:
Joe's Pizza has 84 reviews and a 4.2-star rating but no website, meaning
they're losing customers who search online for pizza in Midtown...

What's missing online:
No website means no Google Business menu integration, no online ordering...

Opportunities:
  ✦ Capture 'pizza near me' searches in the 10001 area
  ✦ Display the menu and daily specials
  ✦ Add an online ordering or reservation link
  ✦ Show photos of the food to attract new customers
  ✦ Collect customer emails for promotions
```

---

## Act 3 — Website Generation

### You click "Generate Website"

The frontend calls `POST /api/business/{id}/website`.

The backend sends a large prompt to the LLM:

```
System: You are an expert web developer. Generate a complete, mobile-responsive,
        single-file HTML website using Tailwind CSS CDN.
        The website must be production-ready with no placeholders.

User:   Business: Joe's Pizza
        Address: 123 W 32nd St, New York, NY 10001
        Phone: (212) 555-1234
        Category: Pizza restaurant
        Description: Best slice in NYC
        Keywords: pizza near me, best pizza Manhattan, NYC pizza slice...
        Summary: Joe's Pizza is a well-loved pizza spot in Midtown Manhattan...

        Generate a complete single-file HTML website.
```

The LLM returns ~200 lines of complete HTML — a fully styled pizza restaurant website with:
- Hero section with the business name and tagline
- About section using the AI-generated summary
- Menu section (placeholder items, structured for easy editing)
- Contact section with phone and address
- Google Maps embed placeholder
- Mobile-responsive Tailwind CSS layout
- Meta tags with the SEO keywords

---

### The Website tab shows the generated code

```
[Preview] [Copy Code] [Deploy]

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="Best pizza in Manhattan...">
  ...
```

You can see a live iframe preview of what the website looks like.

---

## Act 4 — Deployment

### You click "Deploy"

The frontend calls `POST /api/business/{id}/deploy`.

**Step 1: Push to GitHub**

The backend uses Octokit to create a file at:
```
businesses/joes-pizza-10001/index.html
```
in the `local-business-sites` GitHub repository. The file contains the generated HTML.

Returns:
```
githubUrl: https://github.com/Sanaan7788/local-business-sites/blob/main/businesses/joes-pizza-10001/index.html
```

**Step 2: Deploy to Vercel**

The backend calls the Vercel API to deploy the `businesses/joes-pizza-10001/` folder as a new project. Vercel builds instantly (static HTML, no build step). The backend polls for completion.

Returns:
```
deployedUrl: https://joes-pizza-10001.vercel.app
```

---

### The Deployment tab shows the live links

```
Status:     Deployed ✓
GitHub:     github.com/Sanaan7788/.../joes-pizza-10001/index.html
Live URL:   https://joes-pizza-10001.vercel.app

[Open Live Site]

┌─────────────────────────────────────────┐
│  iframe preview of the live website     │
└─────────────────────────────────────────┘
```

The business record is updated. The dashboard stats now show: **1 deployed**.

---

## Act 5 — Outreach

### You click "Generate Outreach"

The frontend calls `POST /api/business/{id}/outreach`.

The LLM generates:

**Email:**
```
Subject: We built a free website for Joe's Pizza

Hi Joe,

I was looking for great pizza near Midtown and found Joe's Pizza on Google —
84 reviews and a 4.2 rating is impressive. I noticed you don't have a website,
which means people searching "pizza near me" on Google can't find your menu
or hours.

I built a website for you. It's live right now:
https://joes-pizza-10001.vercel.app

It took me about an hour. No strings attached — it's yours to keep. If you'd
like me to add your actual menu, update the photos, or connect a domain name,
I'd love to chat.

Best,
[Your name]
```

**Call Script:**
```
Opener:
"Hi, is this Joe's Pizza? Great — my name is [name], I'm a local web developer.
I was searching for pizza in Midtown earlier and found your Google listing —
you've got great reviews. I wanted to call because I just built a website for
you and wanted to make sure you saw it."

Value Proposition:
"Right now when someone searches 'pizza near me' in 10001, they can't click
through to a menu or find your hours. The site I built solves that — it's live
at joes-pizza-10001.vercel.app. It has your address, phone, and a menu section
ready for your items."

If they say "not interested":
"Totally fair. I just wanted to make sure you had the option — a lot of
restaurants don't realize how many customers they're losing to competitors
with websites. The site stays live either way."

If they say "I already have one":
"Oh great — I must have missed it on Maps. Mind if I ask where it is? I can
make sure the one I built redirects there properly."

Close:
"Can I send you the link so you can take a look when you have a minute? There's
no cost, and if you want to make it your own, I charge a flat rate of [price]
to set it up on your domain."
```

---

### The Outreach tab shows everything

```
[Email]              [Call Script]

Subject: We built a free website for Joe's Pizza
──────────────────────────────────────────────────
Hi Joe,

I was looking for great pizza near Midtown...

[Copy Email]
```

---

## Act 6 — CRM Management

### You update the lead status

After sending the email, you go to the **CRM tab**:
- Change lead status from `New` → `Contacted`
- Add a note: "Emailed 21 Mar. No reply yet."
- Set last contacted date to today

The table in the Businesses list updates. The pipeline stats panel shows:

```
Pipeline Summary
────────────────
New:         6
Contacted:   1
Interested:  0
Closed:      0
Rejected:    0

Priority Breakdown
──────────────────
High:    3
Medium:  3
Low:     1
```

---

### Joe calls you back

You move the status to `Interested`, add a note:

```
21 Mar: Emailed. 22 Mar: Joe called back, likes the site.
        Wants his menu added and a custom domain.
        Following up Thursday.
```

Status → `Interested`. Priority stays `High`.

Two days later you close the deal.

Status → `Closed`.

---

## The Full Pipeline at a Glance

```
Zipcode input
    │
    ▼
[Scraper] — Google Maps → 20 businesses found → 7 saved (no website)
    │
    ▼
[Lead Scorer] — auto-scores on save → 3 high / 3 medium / 1 low
    │
    ▼
[AI Analysis] — per business, on demand
    │  keywords (SEO) → stored
    │  summary (2-3 sentences) → stored
    │  insights (why, what's missing, opportunities) → stored
    │
    ▼
[Website Generator] — AI writes complete HTML website → stored
    │
    ▼
[Deployment] — push to GitHub → deploy to Vercel → live URL stored
    │
    ▼
[Outreach Generator] — personalized email + call script → stored
    │
    ▼
[CRM] — you manage: status, notes, last-contacted
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
# Server starts at http://localhost:3001
# Validates all env vars at startup — exits with clear error if anything is wrong

# Terminal 2 — Frontend
cd frontend
npm run dev
# App opens at http://localhost:5173
```

To run a scrape via API directly (without the UI):
```bash
curl -X POST http://localhost:3001/api/scraper/start \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "10001", "category": "restaurants", "maxResults": 20}'

# Poll for status
curl http://localhost:3001/api/scraper/status
```

---

## Important Note on Scraping

The Google Maps scraper uses conservative pacing (random 1–3 second delays, sequential requests, no parallel scraping) to minimize load on Google's servers. This tool is for personal, non-commercial research use only. Use responsibly.
