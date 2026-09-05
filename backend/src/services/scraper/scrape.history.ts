import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { scrapeSessions } from '../../data/schema';
import { getDb } from '../../data/postgres/postgres.connection';
import {
  ErrorEntry,
  SavedEntry,
  ScrapeHistoryEntry,
  ScrapeSessionSummary,
  ScraperState,
  SkippedEntry,
} from './scraper.types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Scrape session history (Postgres)
// ---------------------------------------------------------------------------

const toIso = (d: Date | string): string => (d instanceof Date ? d.toISOString() : d);

const SUMMARY_COLUMNS = {
  id:         scrapeSessions.id,
  zipcode:    scrapeSessions.zipcode,
  category:   scrapeSessions.category,
  startedAt:  scrapeSessions.startedAt,
  finishedAt: scrapeSessions.finishedAt,
  found:      scrapeSessions.found,
  saved:      scrapeSessions.saved,
  skipped:    scrapeSessions.skipped,
  errors:     scrapeSessions.errors,
  tokensUsed: scrapeSessions.tokensUsed,
};

type SummaryRow = Pick<typeof scrapeSessions.$inferSelect, keyof typeof SUMMARY_COLUMNS>;

function rowToSummary(row: SummaryRow): ScrapeSessionSummary {
  return {
    id:         row.id,
    zipcode:    row.zipcode,
    category:   row.category,
    startedAt:  toIso(row.startedAt),
    finishedAt: toIso(row.finishedAt),
    found:      row.found,
    saved:      row.saved,
    skipped:    row.skipped,
    errors:     row.errors,
    tokensUsed: row.tokensUsed ?? 0,
  };
}

export function rowToEntry(row: typeof scrapeSessions.$inferSelect): ScrapeHistoryEntry {
  return {
    ...rowToSummary(row),
    savedList:   (row.savedList as SavedEntry[]) ?? [],
    skippedList: (row.skippedList as SkippedEntry[]) ?? [],
    errorList:   (row.errorList as ErrorEntry[]) ?? [],
    foundNames:  row.foundNames ?? [],
  };
}

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
