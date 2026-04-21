import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AIService } from '../services/ai/ai.service';
import { getRepository } from '../data/repository.factory';
import { ScraperService } from '../services/scraper/scraper.service';
import { ClaudeAdapter } from '../services/llm/adapters/claude.adapter';
import type { LLMImageInput } from '../services/llm/llm.interface';
import type { MenuSection } from '../types/business.types';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB per file, max 10 files
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

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

// POST /api/businesses/:id/menu-from-images
// Accepts up to 10 menu images, sends them to Claude vision to extract
// structured menu items, then merges into business.menu.
router.post('/menu-from-images', upload.array('images', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No images uploaded.' });
      return;
    }

    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${id}` });
      return;
    }

    // Convert uploaded files to base64 image inputs for Claude
    const images: LLMImageInput[] = files.map(f => ({
      base64: f.buffer.toString('base64'),
      mediaType: (f.mimetype === 'image/png' ? 'image/png'
        : f.mimetype === 'image/gif' ? 'image/gif'
        : f.mimetype === 'image/webp' ? 'image/webp'
        : 'image/jpeg') as LLMImageInput['mediaType'],
    }));

    const claude = new ClaudeAdapter();
    const response = await claude.complete({
      systemPrompt:
        'You are a menu digitisation specialist. Extract every menu item from the provided image(s). ' +
        'Group items under their section headings exactly as shown. ' +
        'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
      userPrompt:
        `Extract the full menu from ${files.length > 1 ? 'these ' + files.length + ' menu images' : 'this menu image'} for ${business.name}.\n\n` +
        `Return JSON in this exact shape:\n` +
        `[\n` +
        `  {\n` +
        `    "section": "Section name (e.g. Starters, Mains, Drinks — use 'Menu' if no sections visible)",\n` +
        `    "items": [\n` +
        `      { "name": "Item name", "price": "$X.XX or null if not visible", "description": "Short description or null" }\n` +
        `    ]\n` +
        `  }\n` +
        `]\n\n` +
        `Rules:\n` +
        `- Include every visible item — do not skip anything\n` +
        `- Preserve exact section names from the menu\n` +
        `- If price is not shown, use null\n` +
        `- If description is not shown, use null\n` +
        `- Return an empty array [] if no menu items are visible`,
      images,
      temperature: 0.1,
      maxTokens: 4096,
    });

    // Parse the extracted menu
    const raw = response.content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let extracted: MenuSection[];
    try {
      extracted = JSON.parse(raw);
      if (!Array.isArray(extracted)) throw new Error('Expected array');
    } catch {
      res.status(422).json({ success: false, error: 'Claude could not extract a menu from these images. Try clearer photos.' });
      return;
    }

    if (extracted.length === 0) {
      res.status(422).json({ success: false, error: 'No menu items found in the images. Try clearer or closer photos.' });
      return;
    }

    // Merge with any existing scraped menu (dedupe by section name)
    const existing = business.menu ?? [];
    const existingNames = new Set(existing.map((s: MenuSection) => s.section.toLowerCase()));
    const merged = [
      ...existing,
      ...extracted.filter((s: MenuSection) => !existingNames.has(s.section.toLowerCase())),
    ];

    const updated = await repo.update(id, {
      menu: merged,
      tokensUsed: business.tokensUsed + (response.tokensUsed ?? 0),
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        menu: updated.menu,
        sectionsExtracted: extracted.length,
        itemsExtracted: extracted.reduce((a: number, s: MenuSection) => a + s.items.length, 0),
        tokensUsed: response.tokensUsed,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/rescrape
// Re-scrapes the business from its Google Maps URL, updating phone, address,
// rating, reviews, menu, etc. Preserves all AI outputs and CRM fields.
router.post('/rescrape', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const scraper = ScraperService.getInstance();
    const { updated } = await scraper.rescrape(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Business not found')) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if (msg.includes('no Google Maps URL')) {
      res.status(422).json({ success: false, error: msg });
      return;
    }
    if (msg.includes('already running')) {
      res.status(409).json({ success: false, error: msg });
      return;
    }
    next(err);
  }
});

export default router;
