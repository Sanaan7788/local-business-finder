import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { TONE, type Tone } from '../../lib/tones'
import { PriorityBadge } from '../../components/business/LeadBadges'
import { SectionHeading } from '../../components/ui/Heading'
import { StatTile } from '../../components/ui/StatTile'
import type { Priority } from '../../types/business'
import type { ScraperStatus } from '../../types/scraper'

function ResultList({ summary, tone, children }: { summary: string; tone: Tone; children: ReactNode }) {
  return (
    <details className="mt-2 text-xs">
      <summary className={cn('cursor-pointer font-medium hover:underline', TONE[tone].text)}>{summary}</summary>
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">{children}</div>
    </details>
  )
}

export function LastSessionResults({ status }: { status: ScraperStatus }) {
  return (
    <div className="mt-4 border-t pt-4">
      <SectionHeading
        size="sm"
        title="Last session results"
        action={<Link to="/history" className="text-xs text-primary hover:underline">View all history →</Link>}
        className="mb-3"
      />

      <div className="grid grid-cols-4 gap-3">
        <StatTile size="sm" label="Found" value={status.found} />
        <StatTile size="sm" label="Saved" value={status.saved} tone="success" />
        <StatTile size="sm" label="Skipped" value={status.skipped} tone="warning" />
        <StatTile size="sm" label="Errors" value={status.errors} tone="danger" />
      </div>

      {status.savedList.length > 0 && (
        <ResultList summary={`Saved businesses (${status.savedList.length})`} tone="success">
          {status.savedList.map(b => (
            <Link key={b.id} to={`/businesses/${b.id}`} className="flex items-center justify-between rounded px-2 py-1 hover:bg-surface-2">
              <span className="text-fg">{b.name}</span>
              <PriorityBadge priority={b.priority as Priority} score={b.priorityScore} />
            </Link>
          ))}
        </ResultList>
      )}

      {status.skippedList.length > 0 && (
        <ResultList summary={`Skipped duplicates (${status.skippedList.length})`} tone="warning">
          {status.skippedList.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded px-2 py-1">
              <span className="text-fg">{s.name}</span>
              <span className={TONE.warning.text}>{s.reason}</span>
            </div>
          ))}
        </ResultList>
      )}

      {status.errorList.length > 0 && (
        <ResultList summary={`Errors (${status.errorList.length})`} tone="danger">
          {status.errorList.map((e, i) => (
            <div key={i} className="rounded px-2 py-1">
              <span className="text-fg">{e.name}: </span>
              <span className={TONE.danger.text}>{e.message}</span>
            </div>
          ))}
        </ResultList>
      )}
    </div>
  )
}
