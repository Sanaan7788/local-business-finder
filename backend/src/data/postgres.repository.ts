import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, ilike, or, asc, desc, sql } from 'drizzle-orm';
import { businesses } from './schema';
import {
  Business,
  RawBusiness,
  BusinessSchema,
} from '../types/business.types';
import {
  IBusinessRepository,
  BusinessFilter,
  BusinessSort,
  FindAllOptions,
  FindAllResult,
} from './repository.interface';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// DB connection (singleton)
// ---------------------------------------------------------------------------

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  _db = drizzle(neon(url));
  return _db;
}

// ---------------------------------------------------------------------------
// Row <-> Business conversion helpers
// ---------------------------------------------------------------------------

function rowToBusiness(row: typeof businesses.$inferSelect): Business | null {
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
    keywords:             (row.keywords as string[]) ?? [],
    keywordCategories:    (row.keywordCategories as any) ?? null,
    summary:              row.summary ?? null,
    insights:             (row.insights as any) ?? null,
    contentBrief:         (row.contentBrief as any) ?? null,
    generatedWebsiteCode: row.generatedWebsiteCode ?? null,
    outreach:             (row.outreach as any) ?? null,
    githubUrl:            row.githubUrl ?? null,
    deployedUrl:          row.deployedUrl ?? null,
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

function businessToInsert(b: Business): typeof businesses.$inferInsert {
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
    keywords:             b.keywords,
    keywordCategories:    b.keywordCategories as any,
    summary:              b.summary,
    insights:             b.insights as any,
    contentBrief:         b.contentBrief as any,
    generatedWebsiteCode: b.generatedWebsiteCode,
    outreach:             b.outreach as any,
    githubUrl:            b.githubUrl,
    deployedUrl:          b.deployedUrl,
    leadStatus:           b.leadStatus,
    priority:             b.priority,
    priorityScore:        b.priorityScore,
    notes:                b.notes,
    lastContactedAt:      b.lastContactedAt ? new Date(b.lastContactedAt) : null,
  };
}

// ---------------------------------------------------------------------------
// PostgresBusinessRepository
// ---------------------------------------------------------------------------

export class PostgresBusinessRepository implements IBusinessRepository {

  async create(business: Business): Promise<Business> {
    const db = getDb();
    await db.insert(businesses).values(businessToInsert(business));
    logger.debug('Business created', { id: business.id, name: business.name });
    return business;
  }

  async findAll(options: FindAllOptions = {}): Promise<FindAllResult> {
    const db = getDb();
    const { filter = {}, sort, page = 1, pageSize = 50 } = options;

    const conditions = buildConditions(filter);

    // Count total
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(conditions);
    const total = Number(countResult[0]?.count ?? 0);

    // Build sorted, paginated query
    const orderExpr = buildOrder(sort);
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select()
      .from(businesses)
      .where(conditions)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset(offset);

    const items = rows.map(rowToBusiness).filter((b): b is Business => b !== null);
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<Business | null> {
    const db = getDb();
    const rows = await db.select().from(businesses).where(eq(businesses.id, id));
    if (!rows.length) return null;
    return rowToBusiness(rows[0]);
  }

  async findDuplicate(raw: RawBusiness): Promise<Business | null> {
    const db = getDb();

    // Match on phone
    if (raw.phone) {
      const rows = await db
        .select()
        .from(businesses)
        .where(eq(businesses.phone, raw.phone));
      if (rows.length) return rowToBusiness(rows[0]);
    }

    // Match on name + address (case-insensitive)
    const rows = await db
      .select()
      .from(businesses)
      .where(
        and(
          ilike(businesses.name, raw.name),
          ilike(businesses.address, raw.address),
        ),
      );
    return rows.length ? rowToBusiness(rows[0]) : null;
  }

  async update(id: string, payload: Partial<Business>): Promise<Business> {
    const db = getDb();

    const updateData: Partial<typeof businesses.$inferInsert> = {};

    if (payload.updatedAt !== undefined) updateData.updatedAt = new Date(payload.updatedAt);
    if (payload.name !== undefined)        updateData.name = payload.name;
    if (payload.phone !== undefined)       updateData.phone = payload.phone;
    if (payload.address !== undefined)     updateData.address = payload.address;
    if (payload.zipcode !== undefined)     updateData.zipcode = payload.zipcode;
    if (payload.category !== undefined)    updateData.category = payload.category;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.website !== undefined)     updateData.website = payload.website;
    if (payload.websiteUrl !== undefined)  updateData.websiteUrl = payload.websiteUrl;
    if (payload.rating !== undefined)      updateData.rating = payload.rating;
    if (payload.reviewCount !== undefined) updateData.reviewCount = payload.reviewCount;
    if (payload.googleMapsUrl !== undefined) updateData.googleMapsUrl = payload.googleMapsUrl;
    if (payload.reviewSnippets !== undefined)    updateData.reviewSnippets = payload.reviewSnippets;
    if (payload.keywords !== undefined)          updateData.keywords = payload.keywords;
    if (payload.keywordCategories !== undefined) updateData.keywordCategories = payload.keywordCategories as any;
    if (payload.summary !== undefined)           updateData.summary = payload.summary;
    if (payload.insights !== undefined)          updateData.insights = payload.insights as any;
    if (payload.contentBrief !== undefined)      updateData.contentBrief = payload.contentBrief as any;
    if (payload.generatedWebsiteCode !== undefined) updateData.generatedWebsiteCode = payload.generatedWebsiteCode;
    if (payload.outreach !== undefined)    updateData.outreach = payload.outreach as any;
    if (payload.githubUrl !== undefined)   updateData.githubUrl = payload.githubUrl;
    if (payload.deployedUrl !== undefined) updateData.deployedUrl = payload.deployedUrl;
    if (payload.leadStatus !== undefined)  updateData.leadStatus = payload.leadStatus;
    if (payload.priority !== undefined)    updateData.priority = payload.priority;
    if (payload.priorityScore !== undefined) updateData.priorityScore = payload.priorityScore;
    if (payload.notes !== undefined)       updateData.notes = payload.notes;
    if (payload.lastContactedAt !== undefined) {
      updateData.lastContactedAt = payload.lastContactedAt ? new Date(payload.lastContactedAt) : null;
    }

    // Always bump updatedAt
    updateData.updatedAt = new Date();

    const rows = await db
      .update(businesses)
      .set(updateData)
      .where(eq(businesses.id, id))
      .returning();

    if (!rows.length) throw new Error(`Business not found: ${id}`);
    const updated = rowToBusiness(rows[0]);
    if (!updated) throw new Error(`Business not found: ${id}`);
    logger.debug('Business updated', { id });
    return updated;
  }

  async updateLead(id: string, payload: Partial<Business>): Promise<Business> {
    return this.update(id, payload);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    const result = await db.delete(businesses).where(eq(businesses.id, id)).returning({ id: businesses.id });
    if (!result.length) throw new Error(`Business not found: ${id}`);
    logger.debug('Business deleted', { id });
  }

  async count(filter: BusinessFilter = {}): Promise<number> {
    const db = getDb();
    const conditions = buildConditions(filter);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(conditions);
    return Number(result[0]?.count ?? 0);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConditions(filter: BusinessFilter) {
  const parts = [];

  if (filter.zipcode)    parts.push(eq(businesses.zipcode, filter.zipcode));
  if (filter.leadStatus) parts.push(eq(businesses.leadStatus, filter.leadStatus));
  if (filter.priority)   parts.push(eq(businesses.priority, filter.priority));
  if (filter.hasWebsite !== undefined) parts.push(eq(businesses.website, filter.hasWebsite));
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

function buildOrder(sort?: BusinessSort) {
  if (!sort) return desc(businesses.createdAt);

  const col = (businesses as any)[sort.field] ?? businesses.createdAt;
  return sort.order === 'asc' ? asc(col) : desc(col);
}
