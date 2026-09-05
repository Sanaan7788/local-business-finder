import { Router } from 'express';
import { z } from 'zod';
import { ScraperService } from '../services/scraper/scraper.service';
import { ScrapeHistory } from '../services/scraper/scrape.history';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/async.handler';
import { NotFoundError, UnprocessableError } from '../utils/errors';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Scraper Routes — /api/scraper
//
// POST /import-url       — create a business from its own website URL (sync)
// POST /lookup-maps-url  — create a business from a Google Maps URL (sync)
// POST /start            — queue one background scrape session (202)
// POST /batch            — queue N category sessions for one location (202)
// POST /stop             — stop the running session and clear the queue
// GET  /status           — session state + batch progress (polled)
// GET  /history          — past sessions (summaries), newest first
// GET  /history/:id      — one session with its saved/skipped/error lists
// ---------------------------------------------------------------------------

const router = Router();
const scraper = () => ScraperService.getInstance();

const LocationSchema = z.string().min(2, 'Location must be at least 2 characters').max(50, 'Location too long');
const MaxResultsSchema = z.number().int().min(1).max(200);

const StartScraperSchema = z.object({
  zipcode: LocationSchema,
  category: z.string().min(1).max(100).default('businesses'),
  maxResults: MaxResultsSchema.default(50),
});

const StartBatchSchema = z.object({
  zipcode: LocationSchema,
  categories: z.array(z.string().min(1).max(100)).min(1).max(50),
  maxResults: MaxResultsSchema.default(20),
});

const LookupMapsUrlSchema = z.object({ mapsUrl: z.string().url('Must be a valid URL') });
const ImportUrlSchema = z.object({ websiteUrl: z.string().url('Must be a valid URL') });

router.post('/import-url', validateBody(ImportUrlSchema), asyncHandler(async (req, res) => {
  const { websiteUrl } = req.body as z.infer<typeof ImportUrlSchema>;
  logger.info('Import from URL requested', { websiteUrl });
  res.json({ success: true, data: await scraper().importFromUrl(websiteUrl) });
}));

router.post('/lookup-maps-url', validateBody(LookupMapsUrlSchema), asyncHandler(async (req, res) => {
  const { mapsUrl } = req.body as z.infer<typeof LookupMapsUrlSchema>;
  logger.info('Maps URL lookup requested', { mapsUrl });
  res.json({ success: true, data: await scraper().lookupByMapsUrl(mapsUrl) });
}));

router.post('/start', validateBody(StartScraperSchema), asyncHandler(async (req, res) => {
  const { zipcode, category, maxResults } = req.body as z.infer<typeof StartScraperSchema>;
  scraper().start(zipcode, category, maxResults); // throws ConflictError when busy
  res.status(202).json({ success: true, data: { message: 'Scraping started', zipcode, category, maxResults } });
}));

router.post('/batch', validateBody(StartBatchSchema), asyncHandler(async (req, res) => {
  const { zipcode, categories, maxResults } = req.body as z.infer<typeof StartBatchSchema>;
  scraper().startBatch(zipcode, categories, maxResults);
  res.status(202).json({ success: true, data: { message: 'Batch started', zipcode, jobs: categories.length, maxResults } });
}));

router.post('/stop', asyncHandler(async (_req, res) => {
  const s = scraper();
  if (!s.getState().running) throw new UnprocessableError('No scraping session is running');
  s.stop();
  res.json({ success: true, data: { message: 'Stop signal sent' } });
}));

router.get('/status', (_req, res) => {
  const s = scraper();
  res.json({ success: true, data: { ...s.getState(), batch: s.getBatchProgress() } });
});

router.get('/history', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await ScrapeHistory.getAll() });
}));

router.get('/history/:id', asyncHandler(async (req, res) => {
  const entry = await ScrapeHistory.getById(req.params.id);
  if (!entry) throw new NotFoundError('Scrape session', req.params.id);
  res.json({ success: true, data: entry });
}));

export default router;
