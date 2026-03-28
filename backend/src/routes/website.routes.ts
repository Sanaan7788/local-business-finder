import { Router, Request, Response, NextFunction } from 'express';
import { WebsiteGeneratorService } from '../services/website/website.generator';
import { WebsiteAnalyzerService } from '../services/website/website.analyzer';
import { getRepository } from '../data/repository.factory';

// ---------------------------------------------------------------------------
// Website Routes — mounted at /api/businesses/:id
//
// POST /api/businesses/:id/website  — generate website via LLM, save HTML
// GET  /api/businesses/:id/website  — return stored HTML + slug + vercel.json
// ---------------------------------------------------------------------------

const router = Router({ mergeParams: true });

// POST /api/businesses/:id/website
// Triggers website generation. May take 10–30s (large LLM output).
router.post('/website', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const business = await WebsiteGeneratorService.generate(id);
    res.json({
      success: true,
      data: {
        id: business.id,
        name: business.name,
        htmlLength: business.generatedWebsiteCode?.length ?? 0,
        updatedAt: business.updatedAt,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Business not found')) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    next(err);
  }
});

// GET /api/businesses/:id/website
// Returns the generated HTML, slug, and vercel.json for deployment.
router.get('/website', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const business = await repo.findById(id);

    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }

    if (!business.generatedWebsiteCode) {
      res.status(404).json({
        success: false,
        error: 'Website not yet generated. Call POST /website first.',
      });
      return;
    }

    const pkg = await WebsiteGeneratorService.getPackage(id);
    res.json({
      success: true,
      data: {
        slug: pkg.slug,
        html: pkg.indexHtml,
        vercelJson: pkg.vercelJson,
        htmlLength: pkg.indexHtml.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/businesses/:id/website-analysis
// Crawls the business website and runs LLM analysis. May take 30–90s.
// ---------------------------------------------------------------------------
router.post('/website-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const analysis = await WebsiteAnalyzerService.analyze(id);
    res.json({ success: true, data: analysis });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Business not found')) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if (msg.startsWith('Business has no website URL') || msg.startsWith('Could not crawl')) {
      res.status(400).json({ success: false, error: msg });
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/businesses/:id/website-analysis
// Returns stored analysis (no re-crawl).
// ---------------------------------------------------------------------------
router.get('/website-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }
    res.json({ success: true, data: business.websiteAnalysis ?? null });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/businesses/:id/website-analysis
// Saves manual edits to structured text or improvements list.
// ---------------------------------------------------------------------------
router.patch('/website-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { structured, improvements } = req.body as { structured?: string; improvements?: string[] };
    const updated = await WebsiteAnalyzerService.updateAnalysis(id, { structured, improvements });
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Business not found') || msg.startsWith('No website analysis')) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    next(err);
  }
});

export default router;
