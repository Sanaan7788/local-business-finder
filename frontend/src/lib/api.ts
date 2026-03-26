import axios from 'axios'
import type {
  Business,
  PaginatedData,
  ScraperStatus,
  LeadStatus,
} from '../types/business.ts'

// ---------------------------------------------------------------------------
// Axios instance — all requests go through here
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
})

// Unwrap the { success, data } envelope so callers get data directly
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
)

function unwrap<T>(res: { data: { success: boolean; data: T; error?: string } }): T {
  if (!res.data.success) throw new Error(res.data.error ?? 'API error')
  return res.data.data
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export interface BusinessListParams {
  zipcode?: string
  leadStatus?: LeadStatus
  priority?: string
  hasWebsite?: boolean
  search?: string
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export const businessApi = {
  list: (params: BusinessListParams = {}) =>
    api.get<any>('/businesses', { params }).then(unwrap) as Promise<PaginatedData<Business>>,

  get: (id: string) =>
    api.get<any>(`/businesses/${id}`).then(unwrap) as Promise<Business>,

  stats: () =>
    api.get<any>('/businesses/stats').then(unwrap) as Promise<{
      total: number
      byStatus: Record<LeadStatus, number>
      byPriority: Record<string, number>
      noWebsite: number
      deployed: number
    }>,

  create: (data: { name: string; phone?: string | null; address?: string; zipcode?: string; category?: string; description?: string | null; website?: boolean; websiteUrl?: string | null; rating?: number | null; reviewCount?: number | null; googleMapsUrl?: string | null }) =>
    api.post<any>('/businesses', data).then(unwrap) as Promise<Business>,

  updateProfile: (id: string, data: Partial<Pick<Business, 'name' | 'phone' | 'address' | 'zipcode' | 'category' | 'description' | 'website' | 'websiteUrl' | 'rating' | 'reviewCount' | 'googleMapsUrl'>>) =>
    api.patch<any>(`/businesses/${id}/profile`, data).then(unwrap) as Promise<Business>,

  updateStatus: (id: string, status: LeadStatus) =>
    api.patch<any>(`/businesses/${id}/status`, { status }).then(unwrap) as Promise<Business>,

  updateNotes: (id: string, notes: string | null) =>
    api.patch<any>(`/businesses/${id}/notes`, { notes }).then(unwrap) as Promise<Business>,

  updateContacted: (id: string, lastContactedAt: string | null) =>
    api.patch<any>(`/businesses/${id}/contacted`, { lastContactedAt }).then(unwrap) as Promise<Business>,

  delete: (id: string) =>
    api.delete<any>(`/businesses/${id}`).then(unwrap),

  analyze: (id: string) =>
    api.post<any>(`/businesses/${id}/analyze`).then(unwrap) as Promise<Business>,

  generateContentBrief: (id: string) =>
    api.post<any>(`/businesses/${id}/content-brief`).then(unwrap) as Promise<{ contentBrief: { confirmedFacts: string; assumptions: string } }>,

  generateWebsite: (id: string) =>
    api.post<any>(`/businesses/${id}/website`).then(unwrap) as Promise<{ id: string; htmlLength: number }>,

  getWebsite: (id: string) =>
    api.get<any>(`/businesses/${id}/website`).then(unwrap) as Promise<{ slug: string; html: string }>,
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

export const scraperApi = {
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
