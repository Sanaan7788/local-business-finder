// ---------------------------------------------------------------------------
// Scraper session state — used by the API to report progress
// ---------------------------------------------------------------------------

export interface ScraperState {
  running: boolean;
  zipcode: string | null;
  category: string | null;
  maxResults: number;
  found: number;    // listings seen on Maps
  saved: number;    // new records written to storage
  skipped: number;  // duplicates detected and skipped
  errors: number;   // individual extraction failures
  startedAt: string | null;
  finishedAt: string | null;
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
};
