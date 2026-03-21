import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ScrapeHistoryEntry, ScraperState } from './scraper.types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// ScrapeHistory
//
// Persists one JSON record per completed scraping session.
// Stored in backend/src/data/storage/scrape-history.json
//
// This answers: "which zipcodes have I scraped, when, and what did I find?"
// Each entry contains the full savedList/skippedList/errorList so you can
// review the detail of any past session at any time.
// ---------------------------------------------------------------------------

const STORAGE_DIR = path.resolve(__dirname, '../../data/storage');
const HISTORY_PATH = path.join(STORAGE_DIR, 'scrape-history.json');

function readAll(): ScrapeHistoryEntry[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    logger.warn('scrape-history.json is corrupt — resetting');
    return [];
  }
}

function writeAll(entries: ScrapeHistoryEntry[]): void {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

export const ScrapeHistory = {
  // Save a completed session
  save(state: ScraperState): ScrapeHistoryEntry {
    const entry: ScrapeHistoryEntry = {
      id: uuidv4(),
      zipcode: state.zipcode!,
      category: state.category!,
      startedAt: state.startedAt!,
      finishedAt: state.finishedAt!,
      found: state.found,
      saved: state.saved,
      skipped: state.skipped,
      errors: state.errors,
      savedList: state.savedList,
      skippedList: state.skippedList,
      errorList: state.errorList,
      foundNames: state.foundNames,
    };
    const all = readAll();
    all.unshift(entry); // newest first
    writeAll(all);
    logger.debug('Scrape session saved to history', { id: entry.id, zipcode: entry.zipcode });
    return entry;
  },

  // Get all sessions (newest first)
  getAll(): ScrapeHistoryEntry[] {
    return readAll();
  },

  // Get a specific session by id
  getById(id: string): ScrapeHistoryEntry | null {
    return readAll().find(e => e.id === id) ?? null;
  },

  // Summary of all zipcodes scraped (for the "parent database" view)
  getZipcodes(): { zipcode: string; sessions: number; totalSaved: number; lastScrapedAt: string }[] {
    const all = readAll();
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
        // keep the most recent
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
