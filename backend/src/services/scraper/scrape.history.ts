import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { scrapeSessions } from '../../data/schema';
import { getDb } from '../../data/postgres/postgres.connection';
import { ScrapeHistoryEntry, ScrapeSessionSummary, ScraperState } from './scraper.types';
import { SUMMARY_COLUMNS, rowToEntry, rowToSummary } from './session.mappers';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Scrape session history (Postgres)
// ---------------------------------------------------------------------------

export const ScrapeHistory = {
  async save(state: ScraperState): Promise<void> {
    const id = uuidv4();
    await getDb().insert(scrapeSessions).values({
      id,
      zipcode:     state.zipcode ?? '',
      category:    state.category ?? '',
      startedAt:   new Date(state.startedAt ?? Date.now()),
      finishedAt:  new Date(state.finishedAt ?? Date.now()),
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
    logger.debug('Scrape session saved', { id, zipcode: state.zipcode });
  },

  /** Newest first; counts only. Use getById for the per-business lists. */
  async getAll(): Promise<ScrapeSessionSummary[]> {
    const rows = await getDb()
      .select(SUMMARY_COLUMNS)
      .from(scrapeSessions)
      .orderBy(desc(scrapeSessions.startedAt));
    return rows.map(rowToSummary);
  },

  async getById(id: string): Promise<ScrapeHistoryEntry | null> {
    const rows = await getDb().select().from(scrapeSessions).where(eq(scrapeSessions.id, id));
    return rows.length ? rowToEntry(rows[0]) : null;
  },
};
