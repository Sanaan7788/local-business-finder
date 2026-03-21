import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ScraperService } from '../services/scraper/scraper.service';
import { ScrapeHistory } from '../services/scraper/scrape.history';
import { validateBody } from '../middleware/validate.middleware';
import { logger } from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const StartScraperSchema = z.object({
  zipcode: z
    .string()
    .min(4, 'Zipcode must be at least 4 characters')
    .max(10, 'Zipcode too long')
    .regex(/^[\d\s-]+$/, 'Zipcode must contain only digits'),
  category: z.string().min(1).max(50).default('businesses'),
  maxResults: z.number().int().min(1).max(200).default(50),
});

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
  res.json({ success: true, data: scraper.getState() });
});

// ---------------------------------------------------------------------------
// GET /api/scraper/history
// All past scraping sessions, newest first.
// ---------------------------------------------------------------------------
router.get('/history', (_req: Request, res: Response) => {
  res.json({ success: true, data: ScrapeHistory.getAll() });
});

// ---------------------------------------------------------------------------
// GET /api/scraper/history/:id
// Full detail of one past session including savedList, skippedList, errorList.
// ---------------------------------------------------------------------------
router.get('/history/:id', (req: Request, res: Response) => {
  const entry = ScrapeHistory.getById(req.params.id);
  if (!entry) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }
  res.json({ success: true, data: entry });
});

// ---------------------------------------------------------------------------
// GET /api/scraper/zipcodes
// Summary of all zipcodes scraped — the "parent database" view.
// ---------------------------------------------------------------------------
router.get('/zipcodes', (_req: Request, res: Response) => {
  res.json({ success: true, data: ScrapeHistory.getZipcodes() });
});

export default router;
