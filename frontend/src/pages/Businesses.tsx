import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBusinesses, useDeleteBusiness } from '../hooks/useBusinesses'
import type { Business, LeadStatus, Priority } from '../types/business'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PRIORITY_COLORS } from '../types/business'

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

function RowMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 bg-gray-100 transition-colors text-lg leading-none font-bold"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1">
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function Businesses() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const deleteBusiness = useDeleteBusiness()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [leadStatus, setLeadStatus] = useState<LeadStatus | ''>(
    (searchParams.get('leadStatus') as LeadStatus) ?? ''
  )
  const [priority, setPriority] = useState<Priority | ''>('')
  const [hasWebsite, setHasWebsite] = useState<'all' | 'yes' | 'no'>('all')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const status = searchParams.get('leadStatus')
    if (status) setLeadStatus(status as LeadStatus)
  }, [searchParams])

  const { data, isLoading, isError } = useBusinesses({
    search: search || undefined,
    leadStatus: leadStatus || undefined,
    priority: priority || undefined,
    hasWebsite: hasWebsite === 'all' ? undefined : hasWebsite === 'yes',
    page,
    pageSize: 25,
    sortField,
    sortOrder,
  })

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-blue-600 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const businesses: Business[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  const menuDelete = (b: Business) => {
    if (confirm(`Delete ${b.name}?`)) deleteBusiness.mutate(b.id)
  }

  // ---------------------------------------------------------------------------
  // Shared states
  // ---------------------------------------------------------------------------
  const loadingState = (
    <div className="p-12 text-center">
      <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-gray-400 text-sm">Loading businesses…</p>
    </div>
  )

  const errorState = (
    <div className="p-12 text-center text-red-500">Failed to load businesses. Is the backend running?</div>
  )

  const emptyState = (
    <div className="p-12 text-center text-gray-400">
      <p className="font-medium text-gray-500">No businesses found</p>
      <p className="text-sm mt-1">
        {(search || leadStatus || priority || hasWebsite !== 'all')
          ? 'Try adjusting your filters'
          : 'Run the scraper to get started'}
      </p>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  const pagination = totalPages > 1 && (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-400">
        Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(1)} disabled={page === 1}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">Prev</button>
        <span className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">{page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">Next</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">»</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <p className="text-gray-500 mt-0.5 text-sm">{total} total</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search name, address…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={leadStatus} onChange={e => { setLeadStatus(e.target.value as LeadStatus | ''); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={priority} onChange={e => { setPriority(e.target.value as Priority | ''); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={hasWebsite} onChange={e => { setHasWebsite(e.target.value as any); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Websites</option>
            <option value="no">No Website</option>
            <option value="yes">Has Website</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP — table (hidden on mobile)                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading && loadingState}
        {isError && errorState}
        {!isLoading && !isError && businesses.length === 0 && emptyState}
        {businesses.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>
                  Name <SortIcon field="name" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('rating')}>
                  Rating <SortIcon field="rating" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Website</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('priorityScore')}>
                  Score <SortIcon field="priorityScore" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('leadStatus')}>
                  Status <SortIcon field="leadStatus" />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.map(b => (
                <tr key={b.id}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/businesses/${b.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{b.name}</p>
                    {b.notes?.startsWith('Scrape error:')
                      ? <p className="text-xs text-orange-500 mt-0.5">⚠ Partial data — scrape failed</p>
                      : <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.category}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.rating !== null
                      ? <span>{b.rating}★ {b.reviewCount !== null && <span className="text-gray-400 text-xs">({b.reviewCount})</span>}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {b.website
                      ? <span className="text-green-600 text-xs">✓ Yes</span>
                      : <span className="text-red-500 text-xs font-medium">✗ No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PRIORITY_COLORS[b.priority]}>{b.priority} ({b.priorityScore})</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={LEAD_STATUS_COLORS[b.leadStatus]}>{LEAD_STATUS_LABELS[b.leadStatus]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <RowMenu onDelete={() => menuDelete(b)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE — cards (hidden on desktop)                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="sm:hidden space-y-3">
        {isLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            {loadingState}
          </div>
        )}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            {errorState}
          </div>
        )}
        {!isLoading && !isError && businesses.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            {emptyState}
          </div>
        )}
        {businesses.map(b => (
          <div
            key={b.id}
            onClick={() => navigate(`/businesses/${b.id}`)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-blue-50/40 transition-colors"
          >
            {/* Top row: name + menu */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-snug">{b.name}</p>
                {b.notes?.startsWith('Scrape error:')
                  ? <p className="text-xs text-orange-500 mt-0.5">⚠ Partial data</p>
                  : <p className="text-xs text-gray-400 mt-0.5 truncate">{b.address}</p>
                }
              </div>
              <RowMenu onDelete={() => menuDelete(b)} />
            </div>

            {/* Middle row: category + rating */}
            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{b.category}</span>
              {b.rating !== null && (
                <span className="text-xs text-gray-600">
                  {b.rating}★ {b.reviewCount !== null && <span className="text-gray-400">({b.reviewCount})</span>}
                </span>
              )}
            </div>

            {/* Bottom row: badges */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <Badge className={PRIORITY_COLORS[b.priority]}>{b.priority} ({b.priorityScore})</Badge>
              <Badge className={LEAD_STATUS_COLORS[b.leadStatus]}>{LEAD_STATUS_LABELS[b.leadStatus]}</Badge>
              {b.website
                ? <span className="text-green-600 text-xs font-medium">✓ Website</span>
                : <span className="text-red-500 text-xs font-medium">✗ No website</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination}
    </div>
  )
}
