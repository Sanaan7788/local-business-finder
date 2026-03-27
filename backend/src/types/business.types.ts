import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LeadStatusSchema = z.enum([
  'new',
  'qualified',
  'contacted',
  'interested',
  'closed',
  'rejected',
]);

export const PrioritySchema = z.enum(['high', 'medium', 'low']);

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const InsightsSchema = z.object({
  whyNeedsWebsite: z.string(),
  whatsMissingOnline: z.string(),
  opportunities: z.array(z.string()),
});

export const ContentBriefSchema = z.object({
  // Everything we actually confirmed from scraping / reviews
  confirmedFacts: z.string(),
  // What we reasonably infer for this type of business (clearly labelled as assumptions)
  assumptions: z.string(),
});

// Categorised keywords — each group serves a different purpose in website copy
export const KeywordsSchema = z.object({
  serviceKeywords:    z.array(z.string()), // what they do: "gel nails", "acrylic extensions"
  locationKeywords:   z.array(z.string()), // where they are: "nail salon Houston", "Westheimer Road nails"
  reputationKeywords: z.array(z.string()), // trust signals from reviews: "highly rated", "walk-ins welcome"
  searchPhrases:      z.array(z.string()), // full phrases customers search: "best nail salon near me"
});

export const OutreachSchema = z.object({
  email: z
    .object({
      subject: z.string(),
      body: z.string(),
    })
    .nullable(),
  callScript: z
    .object({
      opener: z.string(),
      valueProposition: z.string(),
      objectionHandlers: z.object({
        notInterested: z.string(),
        haveOne: z.string(),
      }),
      close: z.string(),
    })
    .nullable(),
});

// ---------------------------------------------------------------------------
// Core Business Schema
// Single source of truth for the entire business profile.
// All services, the repository, and the frontend share this contract.
// ---------------------------------------------------------------------------

export const BusinessSchema = z.object({
  // Identity
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Discovery — populated by scraper
  name: z.string().min(1),
  phone: z.string().nullable(),
  address: z.string(),
  zipcode: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  website: z.boolean(),
  websiteUrl: z.string().url().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().min(0).nullable(),
  googleMapsUrl: z.string().url().nullable(),

  // Scraper extras — stored so AI can use them on any future regeneration
  reviewSnippets: z.array(z.string()),

  // AI outputs — populated by LLM service
  keywords: z.array(z.string()),
  keywordCategories: KeywordsSchema.nullable(),
  summary: z.string().nullable(),
  businessContext: z.string().nullable(),
  insights: InsightsSchema.nullable(),
  contentBrief: ContentBriefSchema.nullable(),

  // Generated content — populated by website generator + outreach service
  generatedWebsiteCode: z.string().nullable(),
  outreach: OutreachSchema.nullable(),

  // Deployment — populated by GitHub/Vercel services
  githubUrl: z.string().url().nullable(),
  deployedUrl: z.string().url().nullable(),

  // CRM / Lead management
  leadStatus: LeadStatusSchema,
  priority: PrioritySchema,
  priorityScore: z.number().int().min(0).max(100),
  notes: z.string().nullable(),
  lastContactedAt: z.string().datetime().nullable(),
});

// ---------------------------------------------------------------------------
// Create / Update schemas
// Used for validation at API boundaries.
// ---------------------------------------------------------------------------

// What the scraper produces before IDs and defaults are applied
export const RawBusinessSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable(),
  address: z.string(),
  zipcode: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  website: z.boolean(),
  websiteUrl: z.string().url().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().min(0).nullable(),
  googleMapsUrl: z.string().url().nullable(),
});

// Fields a user can update via the API (CRM fields only)
export const UpdateBusinessSchema = z.object({
  leadStatus: LeadStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  lastContactedAt: z.string().datetime().nullable().optional(),
});

// ---------------------------------------------------------------------------
// TypeScript types inferred from schemas
// Never manually define these — always infer from Zod to stay in sync.
// ---------------------------------------------------------------------------

export type Business = z.infer<typeof BusinessSchema>;
export type RawBusiness = z.infer<typeof RawBusinessSchema>;
export type UpdateBusiness = z.infer<typeof UpdateBusinessSchema>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Insights = z.infer<typeof InsightsSchema>;
export type Outreach = z.infer<typeof OutreachSchema>;
export type ContentBrief = z.infer<typeof ContentBriefSchema>;
export type Keywords = z.infer<typeof KeywordsSchema>;
