import type { LookupResult, ScrapeHistoryEntry, ScrapeSessionSummary, ScraperStatus } from '../../types/scraper'
import { api } from './client'

export const scraperApi = {
  importFromUrl: (websiteUrl: string) => api.post<LookupResult>('/scraper/import-url', { websiteUrl }),
  lookupByMapsUrl: (mapsUrl: string) => api.post<LookupResult>('/scraper/lookup-maps-url', { mapsUrl }),
  start: (zipcode: string, category: string, maxResults: number) =>
    api.post<{ message: string }>('/scraper/start', { zipcode, category, maxResults }),
  startBatch: (zipcode: string, categories: string[], maxResults: number) =>
    api.post<{ message: string }>('/scraper/batch', { zipcode, categories, maxResults }),
  stop: () => api.post<{ message: string }>('/scraper/stop'),
  status: () => api.get<ScraperStatus>('/scraper/status'),
  history: () => api.get<ScrapeSessionSummary[]>('/scraper/history'),
  historyById: (id: string) => api.get<ScrapeHistoryEntry>(`/scraper/history/${id}`),
}

export type ScraperApi = typeof scraperApi
