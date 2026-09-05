import type { ScraperApi } from '../scraper.api'
import type { ScrapeHistoryEntry, ScrapeSessionSummary, ScraperStatus } from '../../../types/scraper'
import { ApiError } from '../api-error'
import { snapshot } from './store'
import { notAvailable } from './not-available'

const IDLE: ScraperStatus = {
  running: false,
  zipcode: null,
  category: null,
  maxResults: 0,
  found: 0,
  saved: 0,
  skipped: 0,
  errors: 0,
  tokensUsed: 0,
  startedAt: null,
  finishedAt: null,
  savedList: [],
  skippedList: [],
  errorList: [],
  foundNames: [],
  batch: { totalJobs: 0, completedJobs: 0, pendingJobs: [] },
}

const toSummary = (s: ScrapeHistoryEntry): ScrapeSessionSummary => ({
  id: s.id,
  zipcode: s.zipcode,
  category: s.category,
  startedAt: s.startedAt,
  finishedAt: s.finishedAt,
  found: s.found,
  saved: s.saved,
  skipped: s.skipped,
  errors: s.errors,
  tokensUsed: s.tokensUsed,
})

/** scraperApi for the static build: history is readable, nothing can run. */
export const staticScraperApi = {
  importFromUrl: notAvailable,
  lookupByMapsUrl: notAvailable,
  start: notAvailable,
  startBatch: notAvailable,
  stop: notAvailable,
  status: () => Promise.resolve(IDLE),
  history: async () => (await snapshot.sessions()).map(toSummary),
  historyById: async (id: string) => {
    const session = (await snapshot.sessions()).find(s => s.id === id)
    if (!session) throw new ApiError('Scrape session not found', 404)
    return session
  },
} satisfies ScraperApi
