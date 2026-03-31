import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ScraperService } from '../services/scraper/scraper.service';
import { ScrapeHistory } from '../services/scraper/scrape.history';
import { ScrapeHistoryPostgres } from '../services/scraper/scrape.history.postgres';
import { validateBody } from '../middleware/validate.middleware';

import { logger } from '../utils/logger';

function getHistory() {
  return process.env.STORAGE_BACKEND === 'postgres' ? ScrapeHistoryPostgres : ScrapeHistory;
}

const router = Router();

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const StartScraperSchema = z.object({
  zipcode: z
    .string()
    .min(2, 'Location must be at least 2 characters')
    .max(50, 'Location too long'),
  category: z.string().min(1).max(100).default('businesses'),
  maxResults: z.number().int().min(1).max(200).default(50),
});

const LookupSchema = z.object({
  businessName: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
});

const ImportUrlSchema = z.object({
  websiteUrl: z.string().url('Must be a valid URL'),
});

const StartBatchSchema = z.object({
  zipcode: z
    .string()
    .min(2)
    .max(50),
  categories: z.array(z.string().min(1).max(100)).min(1).max(50),
  maxResults: z.number().int().min(1).max(200).default(20),
});

// ---------------------------------------------------------------------------
// POST /api/scraper/import-url
// Import a business from its existing website URL.
// Fetches the page, extracts business info, creates a profile, runs AI analysis.
// ---------------------------------------------------------------------------

router.post(
  '/import-url',
  validateBody(ImportUrlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { websiteUrl } = req.body as z.infer<typeof ImportUrlSchema>;
      const scraper = ScraperService.getInstance();

      logger.info('Import from URL requested', { websiteUrl });
      const result = await scraper.importFromUrl(websiteUrl);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/scraper/lookup
// Look up a single specific business by name + location.
// Synchronous — waits for the scrape and returns the result directly.
// ---------------------------------------------------------------------------

router.post(
  '/lookup',
  validateBody(LookupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessName, location } = req.body as z.infer<typeof LookupSchema>;
      const scraper = ScraperService.getInstance();

      logger.info('Single business lookup requested', { businessName, location });
      const result = await scraper.lookup(businessName, location);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/scraper/start
// Starts a scraping session in the background.
// Returns immediately — poll /status for progress.
// ---------------------------------------------------------------------------

router.post(
  '/start',
  validateBody(StartScraperSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { zipcode, category, maxResults } = req.body as z.infer<typeof StartScraperSchema>;
      const scraper = ScraperService.getInstance();

      await scraper.start(zipcode, category, maxResults);

      logger.info('Scraper start requested via API', { zipcode, category, maxResults });

      res.status(202).json({
        success: true,
        data: {
          message: 'Scraping started',
          zipcode,
          category,
          maxResults,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/scraper/batch
// Queue multiple categories for the same zipcode.
// ---------------------------------------------------------------------------

router.post(
  '/batch',
  validateBody(StartBatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { zipcode, categories, maxResults } = req.body as z.infer<typeof StartBatchSchema>;
      const scraper = ScraperService.getInstance();

      await scraper.startBatch(zipcode, categories, maxResults);

      logger.info('Batch scraper started via API', { zipcode, jobs: categories.length, maxResults });

      res.status(202).json({
        success: true,
        data: { message: 'Batch started', zipcode, jobs: categories.length, maxResults },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/scraper/batch-progress
// Returns batch queue state (how many jobs done / pending).
// ---------------------------------------------------------------------------

router.get('/batch-progress', (req: Request, res: Response) => {
  const scraper = ScraperService.getInstance();
  res.json({ success: true, data: scraper.getBatchProgress() });
});

// ---------------------------------------------------------------------------
// POST /api/scraper/stop
// Signals the running session to stop after the current listing.
// ---------------------------------------------------------------------------

router.post('/stop', (req: Request, res: Response) => {
  const scraper = ScraperService.getInstance();
  const state = scraper.getState();

  if (!state.running) {
    res.status(400).json({ success: false, error: 'No scraping session is running' });
    return;
  }

  scraper.stop();
  res.json({ success: true, data: { message: 'Stop signal sent' } });
});

// ---------------------------------------------------------------------------
// GET /api/scraper/status
// Returns the current session state — safe to poll every few seconds.
// ---------------------------------------------------------------------------

router.get('/status', (req: Request, res: Response) => {
  const scraper = ScraperService.getInstance();
  res.json({
    success: true,
    data: {
      ...scraper.getState(),
      batch: scraper.getBatchProgress(),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/scraper/history
// All past scraping sessions, newest first.
// ---------------------------------------------------------------------------
router.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getHistory().getAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// GET /api/scraper/history/:id
// Full detail of one past session including savedList, skippedList, errorList.
// ---------------------------------------------------------------------------
router.get('/history/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await getHistory().getById(req.params.id);
    if (!entry) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// GET /api/scraper/zipcodes
// Summary of all zipcodes scraped — the "parent database" view.
// ---------------------------------------------------------------------------
router.get('/zipcodes', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getHistory().getZipcodes();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
