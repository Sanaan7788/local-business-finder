import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LeadStatusBadge, PriorityBadge } from '../../components/business/LeadBadges'
import { TONE } from '../../lib/tones'
import type { BusinessListItem, LeadStatus } from '../../types/business'
import { RowMenu } from './RowMenu'

export function BusinessCardList({
  businesses,
  onStatus,
  onDelete,
}: {
  businesses: BusinessListItem[]
  onStatus: (b: BusinessListItem, status: LeadStatus) => void
  onDelete?: (b: BusinessListItem) => void
}) {
  return (
    <div className="space-y-3">
      {businesses.map(b => (
        <Card key={b.id} as="article" padding="sm" className="relative p-4 transition-colors hover:bg-surface-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Stretched link: the whole card navigates, the menu sits above it */}
              <Link to={`/businesses/${b.id}`} className="text-sm font-semibold leading-snug text-fg after:absolute after:inset-0 after:content-['']">
                {b.name}
              </Link>
              {b.notes?.startsWith('Scrape error:') ? (
                <p className={cn('mt-0.5 text-xs', TONE.warning.text)}>⚠ Partial data</p>
              ) : (
                <p className="mt-0.5 truncate text-xs text-fg-subtle">{b.address}</p>
              )}
            </div>
            <div className="relative z-10 shrink-0"><RowMenu name={b.name} status={b.leadStatus} onStatus={s => onStatus(b, s)} onDelete={onDelete ? () => onDelete(b) : undefined} /></div>
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <Badge tone="neutral">{b.category}</Badge>
            {b.rating !== null && (
              <span className="text-xs text-fg-muted">
                {b.rating}★ {b.reviewCount !== null && <span className="text-fg-subtle">({b.reviewCount})</span>}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={b.priority} score={b.priorityScore} />
            <LeadStatusBadge status={b.leadStatus} />
            <span className={cn('text-xs font-medium', b.website ? TONE.success.text : TONE.danger.text)}>
              {b.website ? '✓ Website' : '✗ No website'}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
