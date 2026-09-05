import { Router } from 'express';
import { z } from 'zod';
import { getRepository } from '../data/repository.factory';
import { LeadService } from '../services/lead/lead.service';
import { buildBusiness } from '../services/lead/business.factory';
import { scoreLead } from '../services/lead/lead.scorer';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/async.handler';
import { NotFoundError, ValidationError } from '../utils/errors';
import { BUSINESS_LIST_FIELDS, LeadStatusSchema, PrioritySchema } from '../types/business.types';
import { BusinessFilter, BusinessSort } from '../data/repository.interface';

// ---------------------------------------------------------------------------
// Business + Lead Routes — /api/businesses
//
// GET    /categories           — distinct categories with counts
// GET    /stats                — pipeline summary
// GET    /                     — list (light projection) with filter/sort/pagination
// POST   /                     — create a stub business by hand
// GET    /:id                  — full profile
// PATCH  /:id/profile          — edit discoverable fields, rescored
// PATCH  /:id/status           — lead status transition
// PATCH  /:id/notes            — CRM notes
// PATCH  /:id/website-prompt   — save the editable website prompt
// DELETE /:id                  — hard delete
// ---------------------------------------------------------------------------

const router = Router();

// Static paths must be declared before /:id
router.get('/categories', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getRepository().categoryCounts() });
}));

router.get('/stats', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await LeadService.getStats() });
}));

const ListQuerySchema = z.object({
  zipcode:    z.string().optional(),
  leadStatus: LeadStatusSchema.optional(),
  priority:   PrioritySchema.optional(),
  hasWebsite: z.enum(['true', 'false']).optional(),
  search:     z.string().optional(),
  category:   z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  pageSize:   z.coerce.number().int().min(1).max(200).default(50),
  sortField:  z.enum(BUSINESS_LIST_FIELDS).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', asyncHandler(async (req, res) => {
  // Treat empty query values as absent so "?priority=" means "any"
  const query = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const parsed = ListQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError('Invalid query', parsed.error.flatten().fieldErrors);

  const { zipcode, leadStatus, priority, hasWebsite, search, category, page, pageSize, sortField, sortOrder } = parsed.data;
  const filter: BusinessFilter = {
    zipcode, leadStatus, priority, search, category,
    hasWebsite: hasWebsite === undefined ? undefined : hasWebsite === 'true',
  };
  const sort: BusinessSort = { field: sortField, order: sortOrder };

  const result = await getRepository().findAll({ filter, sort, page, pageSize, view: 'list' });
  res.json({ success: true, data: result });
}));

const CreateBusinessSchema = z.object({
  name:          z.string().min(1),
  phone:         z.string().nullable().optional(),
  address:       z.string().default(''),
  zipcode:       z.string().default(''),
  category:      z.string().default(''),
  description:   z.string().nullable().optional(),
  website:       z.boolean().default(false),
  websiteUrl:    z.string().nullable().optional(),
  rating:        z.number().nullable().optional(),
  reviewCount:   z.number().int().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
});

router.post('/', validateBody(CreateBusinessSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof CreateBusinessSchema>;
  const business = await getRepository().create(buildBusiness({
    name:          body.name,
    phone:         body.phone ?? null,
    address:       body.address,
    zipcode:       body.zipcode,
    category:      body.category,
    description:   body.description ?? null,
    website:       body.website,
    websiteUrl:    body.websiteUrl ?? null,
    rating:        body.rating ?? null,
    reviewCount:   body.reviewCount ?? null,
    googleMapsUrl: body.googleMapsUrl ?? null,
  }));
  res.status(201).json({ success: true, data: business });
}));

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

router.patch('/:id/profile', validateBody(UpdateProfileSchema), asyncHandler(async (req, res) => {
  const repo = getRepository();
  const existing = await repo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Business', req.params.id);

  const patch = req.body as z.infer<typeof UpdateProfileSchema>;
  const { score, priority } = scoreLead({ ...existing, ...patch }); // rescore on edited fields
  const updated = await repo.update(req.params.id, { ...patch, priorityScore: score, priority });
  res.json({ success: true, data: updated });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const business = await getRepository().findById(req.params.id);
  if (!business) throw new NotFoundError('Business', req.params.id);
  res.json({ success: true, data: business });
}));

router.patch('/:id/status', validateBody(z.object({ status: LeadStatusSchema })), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await LeadService.updateStatus(req.params.id, req.body.status) });
}));

router.patch('/:id/notes', validateBody(z.object({ notes: z.string().nullable() })), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await LeadService.updateNotes(req.params.id, req.body.notes) });
}));

router.patch('/:id/website-prompt', validateBody(z.object({ websitePrompt: z.string().nullable() })), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getRepository().update(req.params.id, { websitePrompt: req.body.websitePrompt }) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await getRepository().delete(req.params.id);
  res.json({ success: true, data: { deleted: req.params.id } });
}));

export default router;
