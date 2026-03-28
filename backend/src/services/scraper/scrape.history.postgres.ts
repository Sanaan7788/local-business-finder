import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { scrapeSessions } from '../../data/schema';
import { ScrapeHistoryEntry, ScraperState } from './scraper.types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Postgres-backed scrape session history
// Replaces scrape-history.json file when STORAGE_BACKEND=postgres
// ---------------------------------------------------------------------------

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  _db = drizzle(neon(url));
  return _db;
}

function rowToEntry(row: typeof scrapeSessions.$inferSelect): ScrapeHistoryEntry {
  return {
    id:          row.id,
    zipcode:     row.zipcode,
    category:    row.category,
    startedAt:   row.startedAt instanceof Date ? row.startedAt.toISOString() : row.startedAt as string,
    finishedAt:  row.finishedAt instanceof Date ? row.finishedAt.toISOString() : row.finishedAt as string,
    found:       row.found,
    saved:       row.saved,
    skipped:     row.skipped,
    errors:      row.errors,
    tokensUsed:  row.tokensUsed ?? 0,
    savedList:   (row.savedList as any[]) ?? [],
    skippedList: (row.skippedList as any[]) ?? [],
    errorList:   (row.errorList as any[]) ?? [],
    foundNames:  (row.foundNames as string[]) ?? [],
  };
}

export const ScrapeHistoryPostgres = {
  async save(state: ScraperState): Promise<ScrapeHistoryEntry> {
    const db = getDb();
    const id = uuidv4();
    await db.insert(scrapeSessions).values({
      id,
      zipcode:     state.zipcode!,
      category:    state.category!,
      startedAt:   new Date(state.startedAt!),
      finishedAt:  new Date(state.finishedAt!),
      found:       state.found,
      saved:       state.saved,
      skipped:     state.skipped,
      errors:      state.errors,
      tokensUsed:  state.tokensUsed,
      savedList:   state.savedList,
      skippedList: state.skippedList,
      errorList:   state.errorList,
      foundNames:  state.foundNames,
    });
    logger.debug('Scrape session saved to DB', { id, zipcode: state.zipcode });
    return {
      id,
      zipcode:     state.zipcode!,
      category:    state.category!,
      startedAt:   state.startedAt!,
      finishedAt:  state.finishedAt!,
      found:       state.found,
      saved:       state.saved,
      skipped:     state.skipped,
      errors:      state.errors,
      tokensUsed:  state.tokensUsed,
      savedList:   state.savedList,
      skippedList: state.skippedList,
      errorList:   state.errorList,
      foundNames:  state.foundNames,
    };
  },

  async getAll(): Promise<ScrapeHistoryEntry[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(scrapeSessions)
      .orderBy(desc(scrapeSessions.startedAt));
    return rows.map(rowToEntry);
  },

  async getById(id: string): Promise<ScrapeHistoryEntry | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(scrapeSessions)
      .where(eq(scrapeSessions.id, id));
    return rows.length ? rowToEntry(rows[0]) : null;
  },

  async getZipcodes(): Promise<{ zipcode: string; sessions: number; totalSaved: number; lastScrapedAt: string }[]> {
    const all = await this.getAll();
    const map = new Map<string, { sessions: number; totalSaved: number; lastScrapedAt: string }>();
    for (const entry of all) {
      const existing = map.get(entry.zipcode);
      if (!existing) {
        map.set(entry.zipcode, {
          sessions: 1,
          totalSaved: entry.saved,
          lastScrapedAt: entry.finishedAt,
        });
      } else {
        existing.sessions++;
        existing.totalSaved += entry.saved;
        if (entry.finishedAt > existing.lastScrapedAt) {
          existing.lastScrapedAt = entry.finishedAt;
        }
      }
    }
    return Array.from(map.entries())
      .map(([zipcode, data]) => ({ zipcode, ...data }))
      .sort((a, b) => b.lastScrapedAt.localeCompare(a.lastScrapedAt));
  },
};
