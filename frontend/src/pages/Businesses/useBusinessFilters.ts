import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { LeadStatus, Priority } from '../../types/business'
import type { BusinessListParams } from '../../types/api'

export const PAGE_SIZE = 25

export type FilterKey = 'search' | 'leadStatus' | 'priority' | 'website' | 'category' | 'page' | 'sort' | 'dir'

// The URL is the single source of truth for the list state, so filters survive
// reloads and the back button, and Dashboard links (?leadStatus=…) just work.
export function useBusinessFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => {
    const get = (k: FilterKey) => params.get(k) ?? ''
    return {
      search: get('search'),
      leadStatus: get('leadStatus') as LeadStatus | '',
      priority: get('priority') as Priority | '',
      website: get('website') as 'yes' | 'no' | '',
      category: get('category'),
      page: Math.max(1, Number(get('page')) || 1),
      sort: get('sort') || 'createdAt',
      dir: (get('dir') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    }
  }, [params])

  const set = useCallback(
    (key: FilterKey, value: string | number, opts?: { replace?: boolean }) => {
      setParams(prev => {
        const next = new URLSearchParams(prev)
        if (value === '' || (key === 'page' && value === 1)) next.delete(key)
        else next.set(key, String(value))
        if (key !== 'page') next.delete('page') // any filter/sort change goes back to page 1
        return next
      }, opts)
    },
    [setParams],
  )

  const clear = useCallback(() => setParams({}), [setParams])

  const hasActiveFilters = Boolean(filters.search || filters.leadStatus || filters.priority || filters.website || filters.category)

  const listParams: BusinessListParams = {
    search: filters.search || undefined,
    leadStatus: filters.leadStatus || undefined,
    priority: filters.priority || undefined,
    hasWebsite: filters.website === '' ? undefined : filters.website === 'yes',
    category: filters.category || undefined,
    page: filters.page,
    pageSize: PAGE_SIZE,
    sortField: filters.sort,
    sortOrder: filters.dir,
  }

  return { filters, set, clear, hasActiveFilters, listParams }
}
