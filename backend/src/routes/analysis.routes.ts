import { Router, Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai/ai.service';
import { getRepository } from '../data/repository.factory';

// ---------------------------------------------------------------------------
// Analysis Routes — /api/businesses/:id/...
//
// POST /api/businesses/:id/analyze   — run all three AI tasks in sequence
// GET  /api/businesses/:id/insights  — return stored insights
// POST /api/businesses/:id/keywords  — regenerate keywords only
// ---------------------------------------------------------------------------

const router = Router({ mergeParams: true });

// POST /api/businesses/:id/analyze
// Runs keywords → summary → insights in sequence, saves results, returns full profile.
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const business = await AIService.analyzeAll(id);
    res.json({ success: true, data: business });
  } catch (err) {
    if ((err as Error).message.startsWith('Business not found')) {
      res.status(404).json({ success: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
});

// GET /api/businesses/:id/insights
// Returns stored insights without triggering a new LLM call.
router.get('/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }
    if (!business.insights) {
      res.status(404).json({ success: false, error: 'Insights not yet generated. Call POST /analyze first.' });
      return;
    }
    res.json({ success: true, data: business.insights });
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/keywords
// Regenerates keywords only (useful to refresh without re-running everything).
router.post('/keywords', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }
    const keywords = await AIService.generateKeywords(business);
    const updated = await repo.update(id, { keywords, updatedAt: new Date().toISOString() });
    res.json({ success: true, data: { keywords: updated.keywords } });
  } catch (err) {
    next(err);
  }
});

export default router;
