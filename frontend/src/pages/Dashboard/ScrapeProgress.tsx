import { Panel } from '../../components/ui/Panel'
import { ProgressBar } from '../../components/ui/ProgressBar'
import type { ScraperStatus } from '../../types/scraper'

export function ScrapeProgress({ status }: { status: ScraperStatus }) {
  const { batch } = status
  const isBatch = batch.totalJobs > 1
  const batchPct = isBatch ? (batch.completedJobs / batch.totalJobs) * 100 : 0
  const processed = status.saved + status.skipped + status.errors
  const pct = status.found > 0 ? (processed / status.found) * 100 : 0

  return (
    <div aria-live="polite" className="space-y-3">
      {isBatch && (
        <Panel
          tone="info"
          title={`Batch: ${batch.completedJobs}/${batch.totalJobs} jobs — ${status.zipcode}`}
          action={<span className="text-sm">{Math.round(batchPct)}%</span>}
        >
          <ProgressBar value={batchPct} label="Batch progress" />
          <p className="mt-2 text-xs">
            Currently: <span className="font-medium capitalize">{status.category}</span>
          </p>
          {batch.pendingJobs.length > 0 && (
            <p className="mt-1 text-xs">
              Next: {batch.pendingJobs.slice(0, 3).map(j => j.category).join(', ')}
              {batch.pendingJobs.length > 3 ? ` +${batch.pendingJobs.length - 3} more` : ''}
            </p>
          )}
        </Panel>
      )}

      <Panel
        tone="info"
        title={`Scraping ${status.zipcode} — ${status.category}`}
        action={<span className="text-sm">{Math.round(pct)}%</span>}
      >
        <ProgressBar value={pct} label="Session progress" />
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span>Found: {status.found}</span>
          <span>Saved: {status.saved}</span>
          <span>Skipped: {status.skipped}</span>
          <span>Errors: {status.errors}</span>
        </div>
      </Panel>
    </div>
  )
}
