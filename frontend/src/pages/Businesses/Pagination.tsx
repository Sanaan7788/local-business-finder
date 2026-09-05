import { Button } from '../../components/ui/Button'
import { formatNumber } from '../../lib/format'
import { PAGE_SIZE } from './useBusinessFilters'

export function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  const first = (page - 1) * PAGE_SIZE + 1
  const last = Math.min(page * PAGE_SIZE, total)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <p className="text-sm text-fg-subtle">Showing {first}–{last} of {formatNumber(total)}</p>
      <div className="flex items-center gap-1">
        <Button size="xs" aria-label="First page" onClick={() => onPage(1)} disabled={page === 1}>«</Button>
        <Button size="xs" aria-label="Previous page" onClick={() => onPage(page - 1)} disabled={page === 1}>Prev</Button>
        <span className="rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary" aria-current="page">{page} / {totalPages}</span>
        <Button size="xs" aria-label="Next page" onClick={() => onPage(page + 1)} disabled={page === totalPages}>Next</Button>
        <Button size="xs" aria-label="Last page" onClick={() => onPage(totalPages)} disabled={page === totalPages}>»</Button>
      </div>
    </nav>
  )
}
