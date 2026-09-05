import { Router } from 'express';
import { z } from 'zod';
import { WebsiteGeneratorService } from '../services/website/website.generator';
import { WebsiteAnalyzerService } from '../services/website/website.analyzer';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/async.handler';

// ---------------------------------------------------------------------------
// Website Routes — mounted at /api/businesses/:id
//
// POST  /website-prompt/generate — build + save the default website prompt
// POST  /website                 — generate the site from the saved prompt (or default)
// POST  /website-analysis        — crawl the existing site and analyse it
// PATCH /website-analysis        — save manual edits to the analysis
// ---------------------------------------------------------------------------

const router = Router({ mergeParams: true });

router.post('/website-prompt/generate', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await WebsiteGeneratorService.generatePrompt(req.params.id) });
}));

router.post('/website', asyncHandler(async (req, res) => {
  const business = await WebsiteGeneratorService.generate(req.params.id);
  res.json({
    success: true,
    data: {
      id: business.id,
      name: business.name,
      htmlLength: business.generatedWebsiteCode?.length ?? 0,
      updatedAt: business.updatedAt,
    },
  });
}));

router.post('/website-analysis', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await WebsiteAnalyzerService.analyze(req.params.id) });
}));

const UpdateAnalysisSchema = z.object({
  structured: z.string().optional(),
  improvements: z.array(z.string()).optional(),
});

router.patch('/website-analysis', validateBody(UpdateAnalysisSchema), asyncHandler(async (req, res) => {
  const patch = req.body as z.infer<typeof UpdateAnalysisSchema>;
  res.json({ success: true, data: await WebsiteAnalyzerService.updateAnalysis(req.params.id, patch) });
}));

export default router;
