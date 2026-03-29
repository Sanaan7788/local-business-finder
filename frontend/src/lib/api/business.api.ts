import type {
  Business,
  PaginatedData,
  LeadStatus,
} from '../../types/business.ts'
import { api, unwrap } from './client'

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

  analyzeWebsite: (id: string) =>
    api.post<any>(`/businesses/${id}/website-analysis`).then(unwrap) as Promise<import('../../types/business').WebsiteAnalysis>,

  getWebsiteAnalysis: (id: string) =>
    api.get<any>(`/businesses/${id}/website-analysis`).then(unwrap) as Promise<import('../../types/business').WebsiteAnalysis | null>,

  updateWebsiteAnalysis: (id: string, data: { structured?: string; improvements?: string[] }) =>
    api.patch<any>(`/businesses/${id}/website-analysis`, data).then(unwrap) as Promise<import('../../types/business').WebsiteAnalysis>,
}
