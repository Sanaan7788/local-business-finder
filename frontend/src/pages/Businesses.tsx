import { useState, useEffect } from 'react'
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

export default function Businesses() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const deleteBusiness = useDeleteBusiness()

  // Filters from URL params
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [leadStatus, setLeadStatus] = useState<LeadStatus | ''>(
    (searchParams.get('leadStatus') as LeadStatus) ?? ''
  )
  const [priority, setPriority] = useState<Priority | ''>('')
  const [hasWebsite, setHasWebsite] = useState<'all' | 'yes' | 'no'>('all')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Sync search param changes
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{total} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search name, address…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={leadStatus}
            onChange={e => { setLeadStatus(e.target.value as LeadStatus | ''); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={e => { setPriority(e.target.value as Priority | ''); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={hasWebsite}
            onChange={e => { setHasWebsite(e.target.value as any); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Websites</option>
            <option value="no">No Website</option>
            <option value="yes">Has Website</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        )}
        {isError && (
          <div className="p-12 text-center text-red-500">Failed to load businesses. Is the backend running?</div>
        )}
        {!isLoading && !isError && businesses.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            No businesses found. Run the scraper to get started.
          </div>
        )}
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.map(b => (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/businesses/${b.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.category}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.rating !== null ? (
                      <span>{b.rating}★ {b.reviewCount !== null ? <span className="text-gray-400 text-xs">({b.reviewCount})</span> : null}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {b.website
                      ? <span className="text-green-600 text-xs">✓ Yes</span>
                      : <span className="text-red-500 text-xs font-medium">✗ No</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PRIORITY_COLORS[b.priority]}>
                      {b.priority} ({b.priorityScore})
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={LEAD_STATUS_COLORS[b.leadStatus]}>
                      {LEAD_STATUS_LABELS[b.leadStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Delete ${b.name}?`)) deleteBusiness.mutate(b.id)
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
