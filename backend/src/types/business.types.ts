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
  // When this brief was generated — used to detect staleness vs website analysis
  generatedAt: z.string().datetime().optional(),
});

// Categorised keywords — each group serves a different purpose in website copy
export const KeywordsSchema = z.object({
  serviceKeywords:    z.array(z.string()), // what they do: "gel nails", "acrylic extensions"
  locationKeywords:   z.array(z.string()), // where they are: "nail salon Houston", "Westheimer Road nails"
  reputationKeywords: z.array(z.string()), // trust signals from reviews: "highly rated", "walk-ins welcome"
  searchPhrases:      z.array(z.string()), // full phrases customers search: "best nail salon near me"
});

// ---------------------------------------------------------------------------
// Website Analysis — crawled structure + LLM analysis + score
// ---------------------------------------------------------------------------

export const CrawledPageSchema = z.object({
  url: z.string(),
  title: z.string(),
  headings: z.array(z.string()),
  paragraphs: z.array(z.string()),
  navLinks: z.array(z.string()),
  images: z.number(),
  hasContactForm: z.boolean(),
  hasPhone: z.boolean(),
  hasEmail: z.boolean(),
  emails: z.array(z.string()).optional().default([]),
});

export const WebsiteAnalysisSchema = z.object({
  crawledAt: z.string().datetime(),
  pagesVisited: z.number(),
  rawPages: z.array(CrawledPageSchema),
  structured: z.string().nullable(),       // LLM-generated clean structured summary
  improvements: z.array(z.string()),       // LLM-generated improvement suggestions
  score: z.number().min(0).max(10).nullable(), // 0–10 quality score
  scoreReason: z.string().nullable(),      // brief explanation of score
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
// Menu types — scraped from Google Maps Menu tab
// ---------------------------------------------------------------------------

export const MenuItemSchema = z.object({
  name: z.string(),
  price: z.string().nullable(),
  description: z.string().nullable(),
});

export const MenuSectionSchema = z.object({
  section: z.string(),
  items: z.array(MenuItemSchema),
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
  menu: z.array(MenuSectionSchema),
  scrapedEmails: z.array(z.string()).optional().default([]),

  // AI outputs — populated by LLM service
  keywords: z.array(z.string()),
  keywordCategories: KeywordsSchema.nullable(),
  summary: z.string().nullable(),
  businessContext: z.string().nullable(),
  insights: InsightsSchema.nullable(),
  contentBrief: ContentBriefSchema.nullable(),

  // Generated content — populated by website generator + outreach service
  generatedWebsiteCode: z.string().nullable(),
  websitePrompt: z.string().nullable(),
  websiteAnalysis: WebsiteAnalysisSchema.nullable(),
  outreach: OutreachSchema.nullable(),

  // Deployment — populated by GitHub/Vercel services
  githubUrl: z.string().url().nullable(),
  deployedUrl: z.string().url().nullable(),

  // Token tracking
  tokensUsed: z.number().int().min(0),

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
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuSection = z.infer<typeof MenuSectionSchema>;
export type RawBusiness = z.infer<typeof RawBusinessSchema>;
export type UpdateBusiness = z.infer<typeof UpdateBusinessSchema>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Insights = z.infer<typeof InsightsSchema>;
export type Outreach = z.infer<typeof OutreachSchema>;
export type ContentBrief = z.infer<typeof ContentBriefSchema>;
export type Keywords = z.infer<typeof KeywordsSchema>;
export type WebsiteAnalysis = z.infer<typeof WebsiteAnalysisSchema>;
export type CrawledPage = z.infer<typeof CrawledPageSchema>;
