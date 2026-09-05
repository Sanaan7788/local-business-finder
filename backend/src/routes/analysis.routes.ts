import { Router } from 'express';
import multer from 'multer';
import { AIService } from '../services/ai/ai.service';
import { getRepository } from '../data/repository.factory';
import { ScraperService } from '../services/scraper/scraper.service';
import { asyncHandler } from '../middleware/async.handler';
import { NotFoundError, ValidationError } from '../utils/errors';
import type { LLMImageInput } from '../services/llm/llm.interface';
import type { Business } from '../types/business.types';

// ---------------------------------------------------------------------------
// Analysis Routes — mounted at /api/businesses/:id
//
// POST /analyze           — full AI chain (keywords, summary, context, insights, brief)
// POST /content-brief     — regenerate the content brief only
// POST /outreach-email    — generate a personalised outreach email
// POST /menu-from-images  — extract a menu from uploaded photos (Claude vision)
// POST /rescrape          — refresh scraped fields from the stored Maps URL
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB per file, max 10 files
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new ValidationError('Only image files are allowed'));
  },
});

const IMAGE_MEDIA_TYPES = new Set<LLMImageInput['mediaType']>(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const router = Router({ mergeParams: true });

async function findBusiness(id: string): Promise<Business> {
  const business = await getRepository().findById(id);
  if (!business) throw new NotFoundError('Business', id);
  return business;
}

router.post('/analyze', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await AIService.analyzeAll(req.params.id) });
}));

router.post('/content-brief', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const business = await findBusiness(id);
  const { contentBrief, tokensUsed } = await AIService.generateContentBrief(business);
  const updated = await getRepository().update(id, { contentBrief, tokensUsed: business.tokensUsed + tokensUsed });
  res.json({ success: true, data: { contentBrief: updated.contentBrief } });
}));

router.post('/outreach-email', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const business = await findBusiness(id);
  const { subject, body, tokensUsed } = await AIService.generateOutreachEmail(business);
  const updated = await getRepository().update(id, {
    outreach: { email: { subject, body } },
    tokensUsed: business.tokensUsed + tokensUsed,
  });
  res.json({ success: true, data: { outreach: updated.outreach } });
}));

router.post('/menu-from-images', upload.array('images', 10), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) throw new ValidationError('No images uploaded.');

  const business = await findBusiness(id);
  const images: LLMImageInput[] = files.map((f) => ({
    base64: f.buffer.toString('base64'),
    mediaType: IMAGE_MEDIA_TYPES.has(f.mimetype as LLMImageInput['mediaType'])
      ? (f.mimetype as LLMImageInput['mediaType'])
      : 'image/jpeg',
  }));

  const { menu, extracted, tokensUsed } = await AIService.extractMenuFromImages(business, images);
  const updated = await getRepository().update(id, { menu, tokensUsed: business.tokensUsed + tokensUsed });

  res.json({
    success: true,
    data: {
      menu: updated.menu,
      sectionsExtracted: extracted.length,
      itemsExtracted: extracted.reduce((n, s) => n + s.items.length, 0),
      tokensUsed,
    },
  });
}));

router.post('/rescrape', asyncHandler(async (req, res) => {
  const { updated } = await ScraperService.getInstance().rescrape(req.params.id);
  res.json({ success: true, data: updated });
}));

export default router;
