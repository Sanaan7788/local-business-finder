import { Link, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { LeadStatusBadge, PriorityBadge } from '../../components/business/LeadBadges'
import { TONE } from '../../lib/tones'
import type { BusinessListItem } from '../../types/business'
import { RowMenu } from './RowMenu'

function SortableTh({
  field,
  label,
  sort,
  dir,
  onSort,
}: {
  field: string
  label: string
  sort: string
  dir: 'asc' | 'desc'
  onSort: (field: string) => void
}) {
  const active = sort === field
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-4 py-3 text-left font-medium text-fg-muted"
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-fg focus-visible:underline focus-visible:outline-none"
      >
        {label}
        <span aria-hidden className={active ? 'text-primary' : 'text-fg-subtle'}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )
}

export function BusinessTable({
  businesses,
  sort,
  dir,
  onSort,
  onDelete,
}: {
  businesses: BusinessListItem[]
  sort: string
  dir: 'asc' | 'desc'
  onSort: (field: string) => void
  onDelete: (b: BusinessListItem) => void
}) {
  const navigate = useNavigate()
  const th = { sort, dir, onSort }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-surface-2">
        <tr>
          <SortableTh field="name" label="Name" {...th} />
          <th scope="col" className="px-4 py-3 text-left font-medium text-fg-muted">Category</th>
          <SortableTh field="rating" label="Rating" {...th} />
          <th scope="col" className="px-4 py-3 text-left font-medium text-fg-muted">Website</th>
          <SortableTh field="priorityScore" label="Score" {...th} />
          <SortableTh field="leadStatus" label="Status" {...th} />
          <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {businesses.map(b => (
          <tr key={b.id} onClick={() => navigate(`/businesses/${b.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2">
            <td className="px-4 py-3">
              <Link to={`/businesses/${b.id}`} onClick={e => e.stopPropagation()} className="font-medium text-fg hover:underline">
                {b.name}
              </Link>
              {b.notes?.startsWith('Scrape error:') ? (
                <p className={cn('mt-0.5 text-xs', TONE.warning.text)}>⚠ Partial data — scrape failed</p>
              ) : (
                <p className="mt-0.5 text-xs text-fg-subtle">{b.address}</p>
              )}
            </td>
            <td className="px-4 py-3 text-fg-muted">{b.category}</td>
            <td className="px-4 py-3 text-fg-muted">
              {b.rating !== null ? (
                <>{b.rating}★ {b.reviewCount !== null && <span className="text-xs text-fg-subtle">({b.reviewCount})</span>}</>
              ) : '—'}
            </td>
            <td className="px-4 py-3 text-xs">
              {b.website ? <span className={TONE.success.text}>✓ Yes</span> : <span className={cn('font-medium', TONE.danger.text)}>✗ No</span>}
            </td>
            <td className="px-4 py-3"><PriorityBadge priority={b.priority} score={b.priorityScore} /></td>
            <td className="px-4 py-3"><LeadStatusBadge status={b.leadStatus} /></td>
            <td className="px-4 py-3"><RowMenu name={b.name} onDelete={() => onDelete(b)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
