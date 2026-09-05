import { BUSINESS_LIST_FIELDS, type BusinessListField, type BusinessListItem, type LeadStatus, type Priority } from '../../../types/business'
import type { BusinessListParams, BusinessStats, CategoryCount, PaginatedData } from '../../../types/api'
import { LEAD_STATUSES, PRIORITIES } from '../../leads'

// ---------------------------------------------------------------------------
// In-memory equivalents of the backend list/stats/categories queries, with the
// same semantics as postgres.mappers.ts buildConditions/buildOrder and the
// ListQuerySchema in businesses.routes.ts.
// ---------------------------------------------------------------------------

const isListField = (f: string): f is BusinessListField => (BUSINESS_LIST_FIELDS as readonly string[]).includes(f)

/** Empty strings mean "no filter", like the route's empty-value stripping. */
const present = (v: string | undefined): string | undefined => (v === undefined || v === '' ? undefined : v)

type Cell = BusinessListItem[BusinessListField]

/** Postgres ordering: NULLs sort last ascending and first descending. */
function compare(a: Cell, b: Cell, order: 'asc' | 'desc'): number {
  if (a === null || b === null) {
    if (a === b) return 0
    const nullLast = a === null ? 1 : -1
    return order === 'asc' ? nullLast : -nullLast
  }
  const c = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b)
  return order === 'asc' ? c : -c
}

export function applyListParams(items: BusinessListItem[], params: BusinessListParams): PaginatedData<BusinessListItem> {
  const search = present(params.search)?.toLowerCase()
  const category = present(params.category)
  const leadStatus = present(params.leadStatus)
  const priority = present(params.priority)
  const zipcode = present(params.zipcode)
  const { hasWebsite } = params

  const filtered = items.filter(
    b =>
      (search === undefined ||
        b.name.toLowerCase().includes(search) ||
        b.address.toLowerCase().includes(search) ||
        b.category.toLowerCase().includes(search)) &&
      (category === undefined || b.category === category) &&
      (leadStatus === undefined || b.leadStatus === leadStatus) &&
      (priority === undefined || b.priority === priority) &&
      (zipcode === undefined || b.zipcode === zipcode) &&
      (hasWebsite === undefined || b.website === hasWebsite),
  )

  const field: BusinessListField = params.sortField && isListField(params.sortField) ? params.sortField : 'createdAt'
  const order = params.sortOrder === 'asc' ? 'asc' : 'desc'
  const sorted = [...filtered].sort((a, b) => compare(a[field], b[field], order) || a.id.localeCompare(b.id))

  const pageSize = Math.min(200, Math.max(1, Math.trunc(params.pageSize ?? 50)))
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const start = (page - 1) * pageSize

  return { items: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize }
}

export function computeStats(items: BusinessListItem[]): BusinessStats {
  const byStatus = Object.fromEntries(LEAD_STATUSES.map(s => [s, 0])) as Record<LeadStatus, number>
  const byPriority = Object.fromEntries(PRIORITIES.map(p => [p, 0])) as Record<Priority, number>
  let noWebsite = 0
  for (const b of items) {
    byStatus[b.leadStatus] += 1
    byPriority[b.priority] += 1
    if (!b.website) noWebsite += 1
  }
  return { total: items.length, byStatus, byPriority, noWebsite }
}

export function computeCategories(items: BusinessListItem[]): CategoryCount[] {
  const counts = new Map<string, number>()
  for (const b of items) counts.set(b.category, (counts.get(b.category) ?? 0) + 1)
  return [...counts]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
}
