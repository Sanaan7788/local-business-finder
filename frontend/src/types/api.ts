import type { Business, LeadStatus, MenuSection, Priority } from './business'

// ---------------------------------------------------------------------------
// Request / response shapes that are not domain entities
// ---------------------------------------------------------------------------

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface BusinessListParams {
  zipcode?: string
  leadStatus?: LeadStatus
  priority?: Priority
  hasWebsite?: boolean
  search?: string
  category?: string
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BusinessStats {
  total: number
  byStatus: Record<LeadStatus, number>
  byPriority: Record<Priority, number>
  noWebsite: number
}

export interface CategoryCount {
  category: string
  count: number
}

export interface ProviderInfo {
  id: string
  label: string
  model: string
  configured: boolean
  free: string
}

export interface LlmSettings {
  active: string
  providers: ProviderInfo[]
}

export interface TokenStats {
  totalTokensUsed: number
}

export interface MenuExtractResult {
  menu: MenuSection[]
  sectionsExtracted: number
  itemsExtracted: number
  tokensUsed: number
}

export interface CreateBusinessInput {
  name: string
  phone?: string | null
  address?: string
  zipcode?: string
  category?: string
  description?: string | null
  website?: boolean
  websiteUrl?: string | null
  rating?: number | null
  reviewCount?: number | null
  googleMapsUrl?: string | null
}

export type UpdateProfileInput = Partial<
  Pick<Business, 'name' | 'phone' | 'address' | 'zipcode' | 'category' | 'description' | 'website' | 'websiteUrl' | 'rating' | 'reviewCount' | 'googleMapsUrl'>
>
