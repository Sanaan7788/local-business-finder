import { eq, and, ilike, sql, desc, SQL } from 'drizzle-orm';
import { businesses } from '../schema';
import { Business, BusinessListItem, BusinessUpdate, RawBusiness } from '../../types/business.types';
import {
  IBusinessRepository,
  BusinessFilter,
  CategoryCount,
  DedupKey,
  FindAllOptions,
  FindAllResult,
  PipelineStats,
} from '../repository.interface';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { getDb } from './postgres.connection';
import {
  rowToBusiness,
  rowToListItem,
  businessToInsert,
  businessToUpdate,
  buildConditions,
  buildOrder,
  LIST_COLUMNS,
} from './postgres.mappers';

// ---------------------------------------------------------------------------
// PostgresBusinessRepository
// ---------------------------------------------------------------------------

export class PostgresBusinessRepository implements IBusinessRepository {

  async create(business: Business): Promise<Business> {
    await getDb().insert(businesses).values(businessToInsert(business));
    logger.debug('Business created', { id: business.id, name: business.name });
    return business;
  }

  findAll(options: FindAllOptions & { view: 'list' }): Promise<FindAllResult<BusinessListItem>>;
  findAll(options?: FindAllOptions & { view?: 'full' }): Promise<FindAllResult<Business>>;
  async findAll(
    options: FindAllOptions & { view?: 'list' | 'full' } = {},
  ): Promise<FindAllResult<Business | BusinessListItem>> {
    const db = getDb();
    const { filter = {}, sort, page = 1, pageSize = 50, view = 'full' } = options;

    const conditions = buildConditions(filter);
    const orderExpr = buildOrder(sort);
    const offset = (page - 1) * pageSize;

    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(conditions);
    const total = Number(countRows[0]?.count ?? 0);

    if (view === 'list') {
      const rows = await db
        .select(LIST_COLUMNS)
        .from(businesses)
        .where(conditions)
        .orderBy(orderExpr)
        .limit(pageSize)
        .offset(offset);
      return { items: rows.map(rowToListItem), total, page, pageSize };
    }

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
    const rows = await getDb().select().from(businesses).where(eq(businesses.id, id));
    return rows.length ? rowToBusiness(rows[0]) : null;
  }

  async findDuplicateId(raw: Pick<RawBusiness, 'name' | 'address' | 'phone'>): Promise<string | null> {
    const db = getDb();

    if (raw.phone) {
      const byPhone = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.phone, raw.phone))
        .limit(1);
      if (byPhone.length) return byPhone[0].id;
    }

    const byNameAddress = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(ilike(businesses.name, raw.name), ilike(businesses.address, raw.address)))
      .limit(1);
    return byNameAddress[0]?.id ?? null;
  }

  async findDedupKeys(): Promise<DedupKey[]> {
    return getDb()
      .select({
        id: businesses.id,
        name: businesses.name,
        address: businesses.address,
        phone: businesses.phone,
      })
      .from(businesses);
  }

  async update(id: string, payload: BusinessUpdate): Promise<Business> {
    const rows = await getDb()
      .update(businesses)
      .set(businessToUpdate(payload))
      .where(eq(businesses.id, id))
      .returning();

    if (!rows.length) throw new NotFoundError('Business', id);
    const updated = rowToBusiness(rows[0]);
    if (!updated) throw new Error(`Business row failed validation after update: ${id}`);
    logger.debug('Business updated', { id, fields: Object.keys(payload) });
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await getDb()
      .delete(businesses)
      .where(eq(businesses.id, id))
      .returning({ id: businesses.id });
    if (!result.length) throw new NotFoundError('Business', id);
    logger.debug('Business deleted', { id });
  }

  async getStats(filter: BusinessFilter = {}): Promise<PipelineStats> {
    const n = (cond: SQL) => sql<number>`count(*) filter (where ${cond})`;
    const rows = await getDb()
      .select({
        total:      sql<number>`count(*)`,
        noWebsite:  n(eq(businesses.website, false)),
        new:        n(eq(businesses.leadStatus, 'new')),
        qualified:  n(eq(businesses.leadStatus, 'qualified')),
        contacted:  n(eq(businesses.leadStatus, 'contacted')),
        interested: n(eq(businesses.leadStatus, 'interested')),
        closed:     n(eq(businesses.leadStatus, 'closed')),
        rejected:   n(eq(businesses.leadStatus, 'rejected')),
        high:       n(eq(businesses.priority, 'high')),
        medium:     n(eq(businesses.priority, 'medium')),
        low:        n(eq(businesses.priority, 'low')),
      })
      .from(businesses)
      .where(buildConditions(filter));
    const r = rows[0];
    const num = (v: number | string | null | undefined) => Number(v ?? 0);

    return {
      total: num(r?.total),
      byStatus: {
        new:        num(r?.new),
        qualified:  num(r?.qualified),
        contacted:  num(r?.contacted),
        interested: num(r?.interested),
        closed:     num(r?.closed),
        rejected:   num(r?.rejected),
      },
      byPriority: {
        high:   num(r?.high),
        medium: num(r?.medium),
        low:    num(r?.low),
      },
      noWebsite: num(r?.noWebsite),
    };
  }

  async categoryCounts(): Promise<CategoryCount[]> {
    const rows = await getDb()
      .select({ category: businesses.category, count: sql<number>`count(*)` })
      .from(businesses)
      .groupBy(businesses.category)
      .orderBy(desc(sql`count(*)`));
    return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
  }

  async totalTokensUsed(): Promise<number> {
    const rows = await getDb()
      .select({ total: sql<number>`coalesce(sum(tokens_used), 0)` })
      .from(businesses);
    return Number(rows[0]?.total ?? 0);
  }
}
