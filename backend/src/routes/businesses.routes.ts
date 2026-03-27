import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../data/repository.factory';
import { LeadService } from '../services/lead/lead.service';
import { validateBody } from '../middleware/validate.middleware';
import { LeadStatusSchema } from '../types/business.types';
import { scoreLead } from '../services/lead/lead.scorer';
import { BusinessFilter, BusinessSort } from '../data/repository.interface';

// ---------------------------------------------------------------------------
// Business + Lead Routes
//
// GET    /api/businesses              — list with filter/sort/search/pagination
// GET    /api/businesses/stats        — pipeline summary stats
// GET    /api/businesses/:id          — single business profile
// PATCH  /api/businesses/:id/status   — update lead status
// PATCH  /api/businesses/:id/notes    — update notes
// PATCH  /api/businesses/:id/contacted — set last contacted date
// DELETE /api/businesses/:id          — delete a business
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/businesses/stats
// Must be defined BEFORE /:id or Express will treat "stats" as an id param.
// ---------------------------------------------------------------------------
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await LeadService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/businesses
// Query params: zipcode, leadStatus, priority, hasWebsite, search, page, pageSize, sortField, sortOrder
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      zipcode, leadStatus, priority, hasWebsite, search,
      page = '1', pageSize = '50',
      sortField = 'createdAt', sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const filter: BusinessFilter = {};
    if (zipcode)     filter.zipcode = zipcode;
    if (leadStatus)  filter.leadStatus = leadStatus as any;
    if (priority)    filter.priority = priority as any;
    if (hasWebsite !== undefined) filter.hasWebsite = hasWebsite === 'true';
    if (search)      filter.search = search;

    const sort: BusinessSort = {
      field: sortField as any,
      order: (sortOrder === 'asc' ? 'asc' : 'desc'),
    };

    const repo = getRepository();
    const result = await repo.findAll({
      filter,
      sort,
      page: Math.max(1, parseInt(page, 10)),
      pageSize: Math.min(200, Math.max(1, parseInt(pageSize, 10))),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/businesses
// Create a stub business manually (e.g. from a found name with no scraped detail).
// Only name is required — all other fields are optional and default to empty.
// ---------------------------------------------------------------------------
const CreateBusinessSchema = z.object({
  name:          z.string().min(1),
  phone:         z.string().nullable().optional(),
  address:       z.string().optional().default(''),
  zipcode:       z.string().optional().default(''),
  category:      z.string().optional().default(''),
  description:   z.string().nullable().optional(),
  website:       z.boolean().optional().default(false),
  websiteUrl:    z.string().nullable().optional(),
  rating:        z.number().nullable().optional(),
  reviewCount:   z.number().int().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
});

router.post(
  '/',
  validateBody(CreateBusinessSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const body = req.body as z.infer<typeof CreateBusinessSchema>;
      const now = new Date().toISOString();
      const raw = {
        name:          body.name,
        phone:         body.phone ?? null,
        address:       body.address ?? '',
        zipcode:       body.zipcode ?? '',
        category:      body.category ?? '',
        description:   body.description ?? null,
        website:       body.website ?? false,
        websiteUrl:    body.websiteUrl ?? null,
        rating:        body.rating ?? null,
        reviewCount:   body.reviewCount ?? null,
        googleMapsUrl: body.googleMapsUrl ?? null,
      };
      const { score, priority } = scoreLead(raw);
      const business = await repo.create({
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        ...raw,
        reviewSnippets: [],
        keywords: [],
        keywordCategories: null,
        summary: null,
        insights: null,
        contentBrief: null,
          businessContext: null,
        generatedWebsiteCode: null,
        outreach: null,
        githubUrl: null,
        deployedUrl: null,
        leadStatus: 'new',
        priority,
        priorityScore: score,
        notes: null,
        lastContactedAt: null,
      });
      res.status(201).json({ success: true, data: business });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/businesses/:id/profile
// Full manual edit — any discoverable field (name, phone, address, etc.).
// Used for the editable profile UI.
// ---------------------------------------------------------------------------
const UpdateProfileSchema = z.object({
  name:          z.string().min(1).optional(),
  phone:         z.string().nullable().optional(),
  address:       z.string().optional(),
  zipcode:       z.string().optional(),
  category:      z.string().optional(),
  description:   z.string().nullable().optional(),
  website:       z.boolean().optional(),
  websiteUrl:    z.string().nullable().optional(),
  rating:        z.number().nullable().optional(),
  reviewCount:   z.number().int().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
});

router.patch(
  '/:id/profile',
  validateBody(UpdateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const existing = await repo.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: `Business not found: ${req.params.id}` });
        return;
      }
      // Recompute priority score if any scoring-relevant field changed
      const merged = { ...existing, ...req.body };
      const { score, priority } = scoreLead(merged);
      const updated = await repo.update(req.params.id, {
        ...req.body,
        priorityScore: score,
        priority,
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/businesses/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getRepository();
    const business = await repo.findById(req.params.id);
    if (!business) {
      res.status(404).json({ success: false, error: `Business not found: ${req.params.id}` });
      return;
    }
    res.json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/businesses/:id/status
// ---------------------------------------------------------------------------
const UpdateStatusSchema = z.object({
  status: LeadStatusSchema,
});

router.patch(
  '/:id/status',
  validateBody(UpdateStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await LeadService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, data: business });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith('Business not found')) {
        res.status(404).json({ success: false, error: msg });
        return;
      }
      if (msg.startsWith('Invalid transition')) {
        res.status(422).json({ success: false, error: msg });
        return;
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/businesses/:id/notes
// ---------------------------------------------------------------------------
const UpdateNotesSchema = z.object({
  notes: z.string().nullable(),
});

router.patch(
  '/:id/notes',
  validateBody(UpdateNotesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await LeadService.updateNotes(req.params.id, req.body.notes);
      res.json({ success: true, data: business });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith('Business not found')) {
        res.status(404).json({ success: false, error: msg });
        return;
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/businesses/:id/contacted
// ---------------------------------------------------------------------------
const UpdateContactedSchema = z.object({
  lastContactedAt: z.string().datetime().nullable(),
});

router.patch(
  '/:id/contacted',
  validateBody(UpdateContactedSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const business = await LeadService.updateLastContacted(req.params.id, req.body.lastContactedAt);
      res.json({ success: true, data: business });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith('Business not found')) {
        res.status(404).json({ success: false, error: msg });
        return;
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/businesses/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getRepository();
    await repo.delete(req.params.id);
    res.json({ success: true, data: { deleted: req.params.id } });
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
