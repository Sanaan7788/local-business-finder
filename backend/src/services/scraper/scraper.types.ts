// ---------------------------------------------------------------------------
// Scraper session state — used by the API to report progress
// ---------------------------------------------------------------------------

export interface SavedEntry {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  priority: string;
  priorityScore: number;
  website: boolean;
}

export interface SkippedEntry {
  name: string;
  address: string;
  reason: 'phone' | 'name+address';  // which index matched
  existingId: string;                  // the id of the record it matched
}

export interface ErrorEntry {
  name: string;    // card name (or "unknown" if card extraction failed)
  message: string; // what went wrong
}

export interface ScraperState {
  running: boolean;
  zipcode: string | null;
  category: string | null;
  maxResults: number;
  found: number;    // total cards visible on Maps
  saved: number;    // new records written to storage
  skipped: number;  // duplicates detected and skipped
  errors: number;   // individual extraction/navigation failures
  startedAt: string | null;
  finishedAt: string | null;

  // Detailed lists — populated as the session runs
  savedList: SavedEntry[];
  skippedList: SkippedEntry[];
  errorList: ErrorEntry[];
  foundNames: string[];  // all card names pre-collected
}

export const INITIAL_STATE: ScraperState = {
  running: false,
  zipcode: null,
  category: null,
  maxResults: 0,
  found: 0,
  saved: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  finishedAt: null,
  savedList: [],
  skippedList: [],
  errorList: [],
  foundNames: [],
};

// ---------------------------------------------------------------------------
// Scrape history — one record per completed session, persisted to disk
// ---------------------------------------------------------------------------

export interface ScrapeHistoryEntry {
  id: string;           // uuid
  zipcode: string;
  category: string;
  startedAt: string;
  finishedAt: string;
  found: number;
  saved: number;
  skipped: number;
  errors: number;
  savedList: SavedEntry[];
  skippedList: SkippedEntry[];
  errorList: ErrorEntry[];
  foundNames: string[];
}
