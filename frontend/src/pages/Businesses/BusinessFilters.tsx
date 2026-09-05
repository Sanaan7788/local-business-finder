import { useEffect, useRef, useState } from 'react'
import { useBusinessCategories } from '../../hooks/useBusinesses'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS } from '../../lib/leads'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { CategoryDropdown } from './CategoryDropdown'
import type { useBusinessFilters } from './useBusinessFilters'

type Filters = ReturnType<typeof useBusinessFilters>

export function BusinessFilters({ filters, set, clear, hasActiveFilters }: Filters) {
  const { data: categories = [] } = useBusinessCategories()

  // Search is typed locally and written to the URL once typing pauses.
  const [searchInput, setSearchInput] = useState(filters.search)
  const debounced = useDebouncedValue(searchInput, 300)
  const latest = useRef({ search: filters.search, set })
  latest.current = { search: filters.search, set }

  useEffect(() => {
    if (debounced !== latest.current.search) latest.current.set('search', debounced, { replace: true })
  }, [debounced])

  // External URL changes (back button, clear) flow back into the input
  useEffect(() => {
    if (filters.search !== debounced) setSearchInput(filters.search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search])

  return (
    <Card padding="sm" className="p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <Input
          type="search"
          aria-label="Search businesses"
          placeholder="Search name, address…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="col-span-2"
        />
        <CategoryDropdown value={filters.category} onChange={v => set('category', v)} categories={categories} />
        <Select aria-label="Filter by status" value={filters.leadStatus} onChange={e => set('leadStatus', e.target.value)}>
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </Select>
        <Select aria-label="Filter by priority" value={filters.priority} onChange={e => set('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </Select>
        <Select aria-label="Filter by website" value={filters.website} onChange={e => set('website', e.target.value)}>
          <option value="">All Websites</option>
          <option value="no">No Website</option>
          <option value="yes">Has Website</option>
        </Select>
      </div>
      {hasActiveFilters && (
        <div className="mt-3 flex items-center gap-3">
          <Button variant="ghost" size="xs" onClick={() => { setSearchInput(''); clear() }}>✕ Clear filters</Button>
          {filters.leadStatus === 'qualified' && <span className="text-xs font-medium text-fg-muted">Showing Shortlisted only</span>}
        </div>
      )}
    </Card>
  )
}
