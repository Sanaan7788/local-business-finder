import { formatDateTime, formatNumber } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { StatTile } from '../../components/ui/StatTile'
import type { ScrapeSessionSummary } from '../../types/scraper'
import { SessionDetail } from './SessionDetail'

export function SessionRow({ session, expanded, onToggle }: { session: ScrapeSessionSummary; expanded: boolean; onToggle: () => void }) {
  const detailId = `session-${session.id}`
  return (
    <div>
      <Card padding="none" className={expanded ? 'border-primary/40' : undefined}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={onToggle}
          className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-fg">{session.zipcode} — {session.category}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">{formatDateTime(session.startedAt)}</p>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:w-[24rem] sm:shrink-0">
            <StatTile size="sm" label="found" value={session.found} />
            <StatTile size="sm" label="saved" value={session.saved} tone="success" />
            <StatTile size="sm" label="skipped" value={session.skipped} tone="warning" />
            <StatTile size="sm" label="errors" value={session.errors} tone="danger" />
            {/* Always render the slot so rows line up whether or not tokens were used */}
            <StatTile size="sm" label="tokens" value={session.tokensUsed > 0 ? formatNumber(session.tokensUsed) : '—'} tone="purple" />
          </div>
        </button>
      </Card>
      {expanded && (
        <div id={detailId} className="mt-2">
          <SessionDetail id={session.id} onClose={onToggle} />
        </div>
      )}
    </div>
  )
}
