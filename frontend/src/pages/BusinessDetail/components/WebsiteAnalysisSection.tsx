import { useAnalyzeWebsite, useUpdateWebsiteAnalysis } from '../../../hooks/useBusinesses'
import { cn } from '../../../lib/cn'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatDate } from '../../../lib/format'
import { TONE, type Tone } from '../../../lib/tones'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SectionHeading } from '../../../components/ui/Heading'
import { Panel } from '../../../components/ui/Panel'
import type { Business } from '../../../types/business'
import { EditablePanel } from '../website-analysis/EditablePanel'
import { OutreachEmailPanel } from '../website-analysis/OutreachEmailPanel'
import { RawPagesDetails } from '../website-analysis/RawPagesDetails'

const scoreTone = (score: number | null): Tone => (score === null ? 'neutral' : score <= 4 ? 'danger' : score <= 7 ? 'warning' : 'success')

export function WebsiteAnalysisSection({ business }: { business: Business }) {
  const analyze = useAnalyzeWebsite()
  const update = useUpdateWebsiteAnalysis()
  const analysis = business.websiteAnalysis

  if (!business.websiteUrl) {
    return <EmptyState size="sm" title="No website URL" description="Add a website URL in the Overview tab first." />
  }

  const analyzeButton = (label: string, pendingLabel: string) => (
    <Button variant="primary" size="xs" loading={analyze.isPending} onClick={() => analyze.mutate(business.id)}>
      {analyze.isPending ? pendingLabel : label}
    </Button>
  )

  if (!analysis) {
    return (
      <Panel tone="neutral" title="Current Website Structure" description="No analysis yet — crawl and analyse the existing website" action={analyzeButton('Analyze Website', 'Crawling… (may take 60s)')}>
        {analyze.isError ? (
          <Alert tone="danger">{getApiErrorMessage(analyze.error, 'Analysis failed')}</Alert>
        ) : (
          <p className="text-xs text-fg-subtle">Crawls up to 10 pages of {business.websiteUrl}, then scores the site and lists improvements.</p>
        )}
      </Panel>
    )
  }

  const tone = scoreTone(analysis.score)

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Current Website Structure"
        description={`${analysis.pagesVisited} page${analysis.pagesVisited !== 1 ? 's' : ''} crawled · ${formatDate(analysis.crawledAt)}`}
        action={analyzeButton('Re-analyze', 'Re-crawling…')}
      />
      {analyze.isError && <Alert tone="danger">{getApiErrorMessage(analyze.error, 'Analysis failed')}</Alert>}

      <Card padding="sm" className="flex items-start gap-4 p-4">
        <div className={cn('min-w-[60px] rounded-lg px-4 py-2 text-center text-2xl font-bold', TONE[tone].badge)}>
          {analysis.score ?? '—'}<span className="text-sm font-normal">/10</span>
        </div>
        <div>
          <p className="mb-0.5 text-xs font-medium text-fg-muted">Website Quality Score</p>
          <p className="text-sm text-fg">{analysis.scoreReason ?? '—'}</p>
        </div>
      </Card>

      <EditablePanel
        tone="info"
        title="LLM Structured Analysis"
        value={analysis.structured ?? ''}
        onSave={structured => update.mutateAsync({ id: business.id, data: { structured } })}
        saving={update.isPending}
        error={update.error}
        rows={16}
        mono
      >
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{analysis.structured ?? '—'}</pre>
      </EditablePanel>

      <EditablePanel
        tone="warning"
        title="Improvement Opportunities"
        description="For your sales pitch"
        value={analysis.improvements.map(i => `• ${i}`).join('\n')}
        onSave={text =>
          update.mutateAsync({
            id: business.id,
            data: { improvements: text.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean) },
          })
        }
        saving={update.isPending}
        error={update.error}
        hint="One improvement per line"
      >
        <ul className="space-y-2">
          {analysis.improvements.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fg">
              <span aria-hidden className={cn('mt-0.5 shrink-0', TONE.warning.text)}>◆</span>
              {item}
            </li>
          ))}
        </ul>
      </EditablePanel>

      <OutreachEmailPanel business={business} />

      <RawPagesDetails pages={analysis.rawPages} />
    </div>
  )
}
