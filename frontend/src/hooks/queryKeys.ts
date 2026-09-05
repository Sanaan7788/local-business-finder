import type { BusinessListParams } from '../types/api'

// The only file that spells out query key arrays. Keys are hierarchical so a
// prefix invalidation hits exactly the group it names:
//   invalidate(qk.businesses.lists()) → every list page, nothing else.
export const qk = {
  businesses: {
    all: ['businesses'] as const,
    lists: () => [...qk.businesses.all, 'list'] as const,
    list: (params: BusinessListParams) => [...qk.businesses.lists(), params] as const,
    details: () => [...qk.businesses.all, 'detail'] as const,
    detail: (id: string) => [...qk.businesses.details(), id] as const,
    stats: () => [...qk.businesses.all, 'stats'] as const,
    categories: () => [...qk.businesses.all, 'categories'] as const,
  },
  scraper: {
    status: () => ['scraper', 'status'] as const,
    history: () => ['scraper', 'history'] as const,
    session: (id: string) => ['scraper', 'history', id] as const,
  },
  settings: {
    llm: () => ['settings', 'llm'] as const,
    tokens: () => ['settings', 'tokens'] as const,
  },
  snapshot: {
    meta: () => ['snapshot', 'meta'] as const,
  },
}
