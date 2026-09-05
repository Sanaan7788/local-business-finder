// ---------------------------------------------------------------------------
// Scraper types — mirror of backend/src/services/scraper/scraper.types.ts
// ---------------------------------------------------------------------------

export interface SavedEntry {
  id: string
  name: string
  address: string
  phone: string | null
  priority: string
  priorityScore: number
  website: boolean
}

export interface SkippedEntry {
  name: string
  address: string
  reason: 'phone' | 'name+address'
  existingId: string
}

export interface ErrorEntry {
  name: string
  message: string
}

export interface BatchJob {
  zipcode: string
  category: string
  maxResults: number
}

export interface BatchProgress {
  totalJobs: number
  completedJobs: number
  pendingJobs: BatchJob[]
}

export interface ScraperStatus {
  running: boolean
  zipcode: string | null
  category: string | null
  maxResults: number
  found: number
  saved: number
  skipped: number
  errors: number
  tokensUsed: number
  startedAt: string | null
  finishedAt: string | null
  savedList: SavedEntry[]
  skippedList: SkippedEntry[]
  errorList: ErrorEntry[]
  foundNames: string[]
  batch: BatchProgress
}

/** GET /scraper/history — counts only */
export interface ScrapeSessionSummary {
  id: string
  zipcode: string
  category: string
  startedAt: string
  finishedAt: string
  found: number
  saved: number
  skipped: number
  errors: number
  tokensUsed: number
}

/** GET /scraper/history/:id — with the per-business lists */
export interface ScrapeHistoryEntry extends ScrapeSessionSummary {
  savedList: SavedEntry[]
  skippedList: SkippedEntry[]
  errorList: ErrorEntry[]
  foundNames: string[]
}

export interface LookupResult {
  status: 'saved' | 'duplicate' | 'not_found' | 'error'
  businessId?: string
  message: string
}
