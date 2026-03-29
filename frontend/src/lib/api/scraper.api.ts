import type { ScraperStatus } from '../../types/business.ts'
import { api, unwrap } from './client'

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

export const scraperApi = {
  lookup: (businessName: string, location: string) =>
    api.post<any>('/scraper/lookup', { businessName, location }).then(unwrap) as Promise<{
      status: 'saved' | 'duplicate' | 'not_found' | 'error';
      businessId?: string;
      message: string;
    }>,

  start: (zipcode: string, category: string, maxResults: number) =>
    api.post<any>('/scraper/start', { zipcode, category, maxResults }).then(unwrap),

  startBatch: (zipcode: string, categories: string[], maxResults: number) =>
    api.post<any>('/scraper/batch', { zipcode, categories, maxResults }).then(unwrap),

  stop: () =>
    api.post<any>('/scraper/stop').then(unwrap),

  status: () =>
    api.get<any>('/scraper/status').then(unwrap) as Promise<ScraperStatus>,

  history: () =>
    api.get<any>('/scraper/history').then(unwrap) as Promise<any[]>,

  historyById: (id: string) =>
    api.get<any>(`/scraper/history/${id}`).then(unwrap) as Promise<any>,

  zipcodes: () =>
    api.get<any>('/scraper/zipcodes').then(unwrap) as Promise<{
      zipcode: string
      sessions: number
      totalSaved: number
      lastScrapedAt: string
    }[]>,
}
