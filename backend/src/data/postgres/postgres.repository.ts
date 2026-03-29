import { eq, and, ilike, sql } from 'drizzle-orm';
import { businesses } from '../schema';
import {
  Business,
  RawBusiness,
} from '../../types/business.types';
import {
  IBusinessRepository,
  BusinessFilter,
  FindAllOptions,
  FindAllResult,
} from '../repository.interface';
import { logger } from '../../utils/logger';
import { getDb } from './postgres.connection';
import { rowToBusiness, businessToInsert, buildConditions, buildOrder } from './postgres.mappers';

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
    if (payload.summary !== undefined)          updateData.summary = payload.summary;
    if (payload.businessContext !== undefined)  updateData.businessContext = payload.businessContext;
    if (payload.insights !== undefined)         updateData.insights = payload.insights as any;
    if (payload.contentBrief !== undefined)      updateData.contentBrief = payload.contentBrief as any;
    if (payload.generatedWebsiteCode !== undefined) updateData.generatedWebsiteCode = payload.generatedWebsiteCode;
    if (payload.websiteAnalysis !== undefined) updateData.websiteAnalysis = payload.websiteAnalysis as any;
    if (payload.outreach !== undefined)    updateData.outreach = payload.outreach as any;
    if (payload.githubUrl !== undefined)   updateData.githubUrl = payload.githubUrl;
    if (payload.deployedUrl !== undefined) updateData.deployedUrl = payload.deployedUrl;
    if (payload.leadStatus !== undefined)  updateData.leadStatus = payload.leadStatus;
    if (payload.priority !== undefined)    updateData.priority = payload.priority;
    if (payload.tokensUsed !== undefined)   updateData.tokensUsed = payload.tokensUsed;
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

  async totalTokensUsed(): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ total: sql<number>`coalesce(sum(tokens_used), 0)` })
      .from(businesses);
    return Number(result[0]?.total ?? 0);
  }
}
