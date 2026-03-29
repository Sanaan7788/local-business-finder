import type { BusinessListParams } from '../lib/api'

export const keys = {
  businesses: (params: BusinessListParams) => ['businesses', params] as const,
  business: (id: string) => ['business', id] as const,
  stats: () => ['businesses', 'stats'] as const,
  scraper: () => ['scraper', 'status'] as const,
}
