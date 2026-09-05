import type { Business, BusinessListItem, ContentBrief, Outreach, WebsiteAnalysis, LeadStatus } from '../../types/business'
import type {
  BusinessListParams,
  BusinessStats,
  CategoryCount,
  CreateBusinessInput,
  MenuExtractResult,
  PaginatedData,
  UpdateProfileInput,
} from '../../types/api'
import { api } from './client'

export const businessApi = {
  list: (params: BusinessListParams = {}) => api.get<PaginatedData<BusinessListItem>>('/businesses', params),
  categories: () => api.get<CategoryCount[]>('/businesses/categories'),
  stats: () => api.get<BusinessStats>('/businesses/stats'),
  get: (id: string) => api.get<Business>(`/businesses/${id}`),

  create: (data: CreateBusinessInput) => api.post<Business>('/businesses', data),
  updateProfile: (id: string, data: UpdateProfileInput) => api.patch<Business>(`/businesses/${id}/profile`, data),
  updateStatus: (id: string, status: LeadStatus) => api.patch<Business>(`/businesses/${id}/status`, { status }),
  updateNotes: (id: string, notes: string | null) => api.patch<Business>(`/businesses/${id}/notes`, { notes }),
  updateWebsitePrompt: (id: string, websitePrompt: string | null) =>
    api.patch<Business>(`/businesses/${id}/website-prompt`, { websitePrompt }),
  delete: (id: string) => api.delete<{ deleted: string }>(`/businesses/${id}`),

  analyze: (id: string) => api.post<Business>(`/businesses/${id}/analyze`),
  generateContentBrief: (id: string) => api.post<{ contentBrief: ContentBrief }>(`/businesses/${id}/content-brief`),
  generateWebsitePrompt: (id: string) => api.post<Business>(`/businesses/${id}/website-prompt/generate`),
  generateWebsite: (id: string) =>
    api.post<{ id: string; name: string; htmlLength: number; updatedAt: string }>(`/businesses/${id}/website`),
  analyzeWebsite: (id: string) => api.post<WebsiteAnalysis>(`/businesses/${id}/website-analysis`),
  updateWebsiteAnalysis: (id: string, data: { structured?: string; improvements?: string[] }) =>
    api.patch<WebsiteAnalysis>(`/businesses/${id}/website-analysis`, data),
  generateOutreachEmail: (id: string) => api.post<{ outreach: Outreach }>(`/businesses/${id}/outreach-email`),
  rescrape: (id: string) => api.post<Business>(`/businesses/${id}/rescrape`),

  menuFromImages: (id: string, files: File[]) => {
    const form = new FormData()
    files.forEach(f => form.append('images', f))
    return api.post<MenuExtractResult>(`/businesses/${id}/menu-from-images`, form)
  },
}
