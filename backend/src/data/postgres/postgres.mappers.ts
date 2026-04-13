import { eq, and, ilike, or, asc, desc, sql } from 'drizzle-orm';
import { businesses } from '../schema';
import {
  Business,
  BusinessSchema,
} from '../../types/business.types';
import {
  BusinessFilter,
  BusinessSort,
} from '../repository.interface';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Row <-> Business conversion helpers
// ---------------------------------------------------------------------------

export function rowToBusiness(row: typeof businesses.$inferSelect): Business | null {
  const raw = {
    id:                   row.id,
    createdAt:            row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:            row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
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
    reviewSnippets:       (row.reviewSnippets as string[]) ?? [],
    menu:                 (row.menu as any[]) ?? [],
    keywords:             (row.keywords as string[]) ?? [],
    keywordCategories:    (row.keywordCategories as any) ?? null,
    summary:              row.summary ?? null,
    businessContext:      row.businessContext ?? null,
    insights:             (row.insights as any) ?? null,
    contentBrief:         (row.contentBrief as any) ?? null,
    generatedWebsiteCode: row.generatedWebsiteCode ?? null,
    websitePrompt:        row.websitePrompt ?? null,
    websiteAnalysis:      (row.websiteAnalysis as any) ?? null,
    outreach:             (row.outreach as any) ?? null,
    githubUrl:            row.githubUrl ?? null,
    deployedUrl:          row.deployedUrl ?? null,
    tokensUsed:           row.tokensUsed ?? 0,
    leadStatus:           row.leadStatus as any,
    priority:             row.priority as any,
    priorityScore:        row.priorityScore,
    notes:                row.notes ?? null,
    lastContactedAt:      row.lastContactedAt instanceof Date
                            ? row.lastContactedAt.toISOString()
                            : row.lastContactedAt ?? null,
  };

  const result = BusinessSchema.safeParse(raw);
  if (!result.success) {
    logger.warn('Postgres row failed schema validation', {
      name: row.name,
      errors: result.error.flatten(),
    });
    return null;
  }
  return result.data;
}

export function businessToInsert(b: Business): typeof businesses.$inferInsert {
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
    menu:                 b.menu as any,
    keywords:             b.keywords,
    keywordCategories:    b.keywordCategories as any,
    summary:              b.summary,
    businessContext:      b.businessContext,
    insights:             b.insights as any,
    contentBrief:         b.contentBrief as any,
    generatedWebsiteCode: b.generatedWebsiteCode,
    websitePrompt:        b.websitePrompt,
    websiteAnalysis:      b.websiteAnalysis as any,
    outreach:             b.outreach as any,
    githubUrl:            b.githubUrl,
    deployedUrl:          b.deployedUrl,
    tokensUsed:           b.tokensUsed,
    leadStatus:           b.leadStatus,
    priority:             b.priority,
    priorityScore:        b.priorityScore,
    notes:                b.notes,
    lastContactedAt:      b.lastContactedAt ? new Date(b.lastContactedAt) : null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildConditions(filter: BusinessFilter) {
  const parts = [];

  if (filter.zipcode)    parts.push(eq(businesses.zipcode, filter.zipcode));
  if (filter.leadStatus) parts.push(eq(businesses.leadStatus, filter.leadStatus));
  if (filter.priority)   parts.push(eq(businesses.priority, filter.priority));
  if (filter.hasWebsite !== undefined) parts.push(eq(businesses.website, filter.hasWebsite));
  if (filter.category)   parts.push(ilike(businesses.category, filter.category));
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

  const col = (businesses as any)[sort.field] ?? businesses.createdAt;
  return sort.order === 'asc' ? asc(col) : desc(col);
}
