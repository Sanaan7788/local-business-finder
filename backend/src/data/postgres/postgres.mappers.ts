import { eq, and, ilike, or, asc, desc } from 'drizzle-orm';
import { businesses } from '../schema';
import {
  Business,
  BusinessListItem,
  BusinessListField,
  BusinessSchema,
  BusinessUpdate,
  LeadStatus,
  Priority,
} from '../../types/business.types';
import { BusinessFilter, BusinessSort } from '../repository.interface';
import { logger } from '../../utils/logger';

type Row = typeof businesses.$inferSelect;
type Insert = typeof businesses.$inferInsert;

const toIso = (d: Date | string | null | undefined): string | null =>
  d instanceof Date ? d.toISOString() : d ?? null;

// ---------------------------------------------------------------------------
// Row -> Business (full, Zod-validated)
// ---------------------------------------------------------------------------

export function rowToBusiness(row: Row): Business | null {
  const raw = {
    id:                   row.id,
    createdAt:            toIso(row.createdAt),
    updatedAt:            toIso(row.updatedAt),
    name:                 row.name,
    phone:                row.phone ?? null,
    address:              row.address,
    zipcode:              row.zipcode,
    category:             row.category,
    description:          row.description ?? null,
    website:              row.website,
    websiteUrl:           row.websiteUrl ?? null,
    rating:               row.rating ?? null,
    reviewCount:          row.reviewCount ?? null,
    googleMapsUrl:        row.googleMapsUrl ?? null,
    reviewSnippets:       row.reviewSnippets ?? [],
    menu:                 row.menu ?? [],
    scrapedEmails:        row.scrapedEmails ?? [],
    keywords:             row.keywords ?? [],
    keywordCategories:    row.keywordCategories ?? null,
    summary:              row.summary ?? null,
    businessContext:      row.businessContext ?? null,
    insights:             row.insights ?? null,
    contentBrief:         row.contentBrief ?? null,
    generatedWebsiteCode: row.generatedWebsiteCode ?? null,
    websitePrompt:        row.websitePrompt ?? null,
    websiteAnalysis:      row.websiteAnalysis ?? null,
    outreach:             row.outreach ?? null,
    tokensUsed:           row.tokensUsed ?? 0,
    leadStatus:           row.leadStatus,
    priority:             row.priority,
    priorityScore:        row.priorityScore,
    notes:                row.notes ?? null,
    lastContactedAt:      toIso(row.lastContactedAt),
  };

  const result = BusinessSchema.safeParse(raw);
  if (!result.success) {
    logger.warn('Postgres row failed schema validation', {
      id: row.id,
      name: row.name,
      errors: result.error.flatten(),
    });
    return null;
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Row -> BusinessListItem (light projection, no Zod)
// ---------------------------------------------------------------------------

export const LIST_COLUMNS = {
  id:              businesses.id,
  createdAt:       businesses.createdAt,
  updatedAt:       businesses.updatedAt,
  name:            businesses.name,
  phone:           businesses.phone,
  address:         businesses.address,
  zipcode:         businesses.zipcode,
  category:        businesses.category,
  website:         businesses.website,
  websiteUrl:      businesses.websiteUrl,
  rating:          businesses.rating,
  reviewCount:     businesses.reviewCount,
  leadStatus:      businesses.leadStatus,
  priority:        businesses.priority,
  priorityScore:   businesses.priorityScore,
  notes:           businesses.notes,
  lastContactedAt: businesses.lastContactedAt,
  tokensUsed:      businesses.tokensUsed,
} satisfies Record<BusinessListField, unknown>;

export function rowToListItem(row: Pick<Row, BusinessListField>): BusinessListItem {
  return {
    id:              row.id,
    createdAt:       toIso(row.createdAt) ?? '',
    updatedAt:       toIso(row.updatedAt) ?? '',
    name:            row.name,
    phone:           row.phone ?? null,
    address:         row.address,
    zipcode:         row.zipcode,
    category:        row.category,
    website:         row.website,
    websiteUrl:      row.websiteUrl ?? null,
    rating:          row.rating ?? null,
    reviewCount:     row.reviewCount ?? null,
    leadStatus:      row.leadStatus as LeadStatus,
    priority:        row.priority as Priority,
    priorityScore:   row.priorityScore,
    notes:           row.notes ?? null,
    lastContactedAt: toIso(row.lastContactedAt),
    tokensUsed:      row.tokensUsed ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Business -> insert / update payloads
// ---------------------------------------------------------------------------

export function businessToInsert(b: Business): Insert {
  return {
    id:                   b.id,
    createdAt:            new Date(b.createdAt),
    updatedAt:            new Date(b.updatedAt),
    name:                 b.name,
    phone:                b.phone,
    address:              b.address,
    zipcode:              b.zipcode,
    category:             b.category,
    description:          b.description,
    website:              b.website,
    websiteUrl:           b.websiteUrl,
    rating:               b.rating,
    reviewCount:          b.reviewCount,
    googleMapsUrl:        b.googleMapsUrl,
    reviewSnippets:       b.reviewSnippets,
    menu:                 b.menu,
    scrapedEmails:        b.scrapedEmails,
    keywords:             b.keywords,
    keywordCategories:    b.keywordCategories,
    summary:              b.summary,
    businessContext:      b.businessContext,
    insights:             b.insights,
    contentBrief:         b.contentBrief,
    generatedWebsiteCode: b.generatedWebsiteCode,
    websitePrompt:        b.websitePrompt,
    websiteAnalysis:      b.websiteAnalysis,
    outreach:             b.outreach,
    tokensUsed:           b.tokensUsed,
    leadStatus:           b.leadStatus,
    priority:             b.priority,
    priorityScore:        b.priorityScore,
    notes:                b.notes,
    lastContactedAt:      b.lastContactedAt ? new Date(b.lastContactedAt) : null,
  };
}

// Business property names and Drizzle column property names are identical by
// construction (schema.ts mirrors the Business type). This guard fails to
// compile if a Business field is ever added without a matching column, so an
// update can never be silently dropped again.
type NonColumnUpdateKeys = Exclude<keyof BusinessUpdate, keyof Insert>;
const everyUpdateKeyIsAColumn: [NonColumnUpdateKeys] extends [never] ? true : never = true;
void everyUpdateKeyIsAColumn;

export function businessToUpdate(payload: BusinessUpdate): Partial<Insert> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    out[key] = key === 'lastContactedAt' ? (value ? new Date(value as string) : null) : value;
  }
  out.updatedAt = new Date(); // the only place updatedAt is set
  return out as Partial<Insert>;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function buildConditions(filter: BusinessFilter) {
  const parts = [];

  if (filter.zipcode)    parts.push(eq(businesses.zipcode, filter.zipcode));
  if (filter.leadStatus) parts.push(eq(businesses.leadStatus, filter.leadStatus));
  if (filter.priority)   parts.push(eq(businesses.priority, filter.priority));
  if (filter.hasWebsite !== undefined) parts.push(eq(businesses.website, filter.hasWebsite));
  // Exact match: values come from GET /categories, and eq can use the index
  if (filter.category)   parts.push(eq(businesses.category, filter.category));
  if (filter.search) {
    const q = `%${filter.search}%`;
    parts.push(
      or(
        ilike(businesses.name, q),
        ilike(businesses.address, q),
        ilike(businesses.category, q),
      ),
    );
  }

  return parts.length > 0 ? and(...parts) : undefined;
}

export function buildOrder(sort?: BusinessSort) {
  if (!sort) return desc(businesses.createdAt);
  const col = businesses[sort.field] ?? businesses.createdAt;
  return sort.order === 'asc' ? asc(col) : desc(col);
}
