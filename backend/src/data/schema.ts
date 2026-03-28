import {
  pgTable,
  text,
  boolean,
  real,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// businesses table — mirrors Business type exactly
// ---------------------------------------------------------------------------

export const businesses = pgTable('businesses', {
  // Identity
  id:        text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),

  // Discovery
  name:          text('name').notNull(),
  phone:         text('phone'),
  address:       text('address').notNull(),
  zipcode:       text('zipcode').notNull(),
  category:      text('category').notNull(),
  description:   text('description'),
  website:       boolean('website').notNull().default(false),
  websiteUrl:    text('website_url'),
  rating:        real('rating'),
  reviewCount:   integer('review_count'),
  googleMapsUrl: text('google_maps_url'),

  // Scraper extras
  reviewSnippets: jsonb('review_snippets').$type<string[]>().notNull().default([]),

  // AI outputs
  keywords:          jsonb('keywords').$type<string[]>().notNull().default([]),
  keywordCategories: jsonb('keyword_categories'),
  summary:           text('summary'),
  businessContext:   text('business_context'),
  insights:          jsonb('insights'),
  contentBrief:      jsonb('content_brief'),

  // Generated content
  generatedWebsiteCode: text('generated_website_code'),
  websiteAnalysis:      jsonb('website_analysis'),
  outreach:             jsonb('outreach'),

  // Deployment
  githubUrl:   text('github_url'),
  deployedUrl: text('deployed_url'),

  // Token tracking
  tokensUsed:      integer('tokens_used').notNull().default(0),

  // CRM / Lead
  leadStatus:      text('lead_status').notNull().default('new'),
  priority:        text('priority').notNull().default('low'),
  priorityScore:   integer('priority_score').notNull().default(0),
  notes:           text('notes'),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// scrape_sessions table — replaces scrape-history.json
// ---------------------------------------------------------------------------

export const scrapeSessions = pgTable('scrape_sessions', {
  id:         text('id').primaryKey(),
  zipcode:    text('zipcode').notNull(),
  category:   text('category').notNull(),
  startedAt:  timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
  found:      integer('found').notNull().default(0),
  saved:      integer('saved').notNull().default(0),
  skipped:    integer('skipped').notNull().default(0),
  errors:     integer('errors').notNull().default(0),
  tokensUsed: integer('tokens_used').notNull().default(0),
  savedList:   jsonb('saved_list').$type<any[]>().notNull().default([]),
  skippedList: jsonb('skipped_list').$type<any[]>().notNull().default([]),
  errorList:   jsonb('error_list').$type<any[]>().notNull().default([]),
  foundNames:  jsonb('found_names').$type<string[]>().notNull().default([]),
});
