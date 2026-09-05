import { scrapeSessions } from '../../data/schema';
import {
  ErrorEntry,
  SavedEntry,
  ScrapeHistoryEntry,
  ScrapeSessionSummary,
  SkippedEntry,
} from './scraper.types';

// ---------------------------------------------------------------------------
// scrape_sessions row → API shapes. Kept free of connection/config imports so
// scripts (export-static) can reuse them without booting the app.
// ---------------------------------------------------------------------------

const toIso = (d: Date | string): string => (d instanceof Date ? d.toISOString() : d);

export const SUMMARY_COLUMNS = {
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

export type SummaryRow = Pick<typeof scrapeSessions.$inferSelect, keyof typeof SUMMARY_COLUMNS>;

export function rowToSummary(row: SummaryRow): ScrapeSessionSummary {
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
