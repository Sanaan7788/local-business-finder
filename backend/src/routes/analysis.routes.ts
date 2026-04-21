import { Router, Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai/ai.service';
import { getRepository } from '../data/repository.factory';

// ---------------------------------------------------------------------------
// Analysis Routes — /api/businesses/:id/...
//
// POST /api/businesses/:id/analyze        — run all AI tasks in sequence
// GET  /api/businesses/:id/insights       — return stored insights
// POST /api/businesses/:id/keywords       — regenerate keywords only
// POST /api/businesses/:id/content-brief  — regenerate content brief only
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
    const { flat: keywords, categories: keywordCategories, tokensUsed } = await AIService.generateKeywords(business);
    const updated = await repo.update(id, { keywords, keywordCategories, tokensUsed: business.tokensUsed + tokensUsed, updatedAt: new Date().toISOString() });
    res.json({ success: true, data: { keywords: updated.keywords, keywordCategories: updated.keywordCategories } });
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/content-brief
// Regenerates content brief only.
router.post('/content-brief', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }
    const { contentBrief, tokensUsed } = await AIService.generateContentBrief(business);
    const updated = await repo.update(id, { contentBrief, tokensUsed: business.tokensUsed + tokensUsed, updatedAt: new Date().toISOString() });
    res.json({ success: true, data: { contentBrief: updated.contentBrief } });
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/outreach-email
// Generates (or regenerates) a personalised outreach email based on website improvements.
// Stores result in outreach.email so it persists without re-generating.
router.post('/outreach-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }
    if (!business.websiteAnalysis?.improvements?.length) {
      res.status(422).json({ success: false, error: 'Run website analysis first to generate improvement opportunities.' });
      return;
    }
    const { subject, body, tokensUsed } = await AIService.generateOutreachEmail(business);
    const outreach = { ...(business.outreach ?? { callScript: null }), email: { subject, body } };
    const updated = await repo.update(id, { outreach, tokensUsed: business.tokensUsed + tokensUsed, updatedAt: new Date().toISOString() });
    res.json({ success: true, data: { outreach: updated.outreach } });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Business not found')) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    next(err);
  }
});

export default router;
