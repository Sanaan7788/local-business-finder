import { useAnalyze } from '../../../hooks/useBusinesses'
import { IS_STATIC, serverOnly } from '../../../lib/env'
import { getApiErrorMessage } from '../../../lib/errors'
import { ServerOnly } from '../../../components/ServerOnly'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SectionHeading } from '../../../components/ui/Heading'
import { Panel } from '../../../components/ui/Panel'
import type { Business } from '../../../types/business'
import { KeywordGroups } from '../ai/KeywordGroups'

export function AIAnalysisTab({ business }: { business: Business }) {
  const analyze = useAnalyze()
  const hasData = Boolean(business.summary || business.businessContext || business.keywords.length > 0 || business.insights)

  if (!hasData) {
    return (
      <>
        <EmptyState
          title="No AI analysis yet."
          description={
            IS_STATIC
              ? 'No AI analysis was generated before this snapshot was exported. Run it in the local app.'
              : 'Generates keywords, summary, business context and insights in one go.'
          }
          action={serverOnly(
            <Button variant="primary" size="md" loading={analyze.isPending} onClick={() => analyze.mutate(business.id)}>
              {analyze.isPending ? 'Analyzing… (may take 2–3 min)' : 'Generate AI Analysis'}
            </Button>,
          )}
        />
        {analyze.isError && <Alert tone="danger">{getApiErrorMessage(analyze.error)}</Alert>}
      </>
    )
  }

  return (
    <div className="space-y-8">
      <ServerOnly>
        <div className="flex items-center justify-end gap-3">
          {analyze.isError && <span className="text-xs text-fg-subtle">{getApiErrorMessage(analyze.error)}</span>}
          <Button variant="link" loading={analyze.isPending} onClick={() => analyze.mutate(business.id)}>
            {analyze.isPending ? 'Re-analyzing…' : 'Re-analyze'}
          </Button>
        </div>
      </ServerOnly>

      {(business.summary || business.businessContext) && (
        <div className="space-y-4">
          <SectionHeading size="sm" title="Summary" />
          {business.summary && (
            <Panel tone="info" title="Business Summary">
              <p className="text-sm leading-relaxed text-fg">{business.summary}</p>
            </Panel>
          )}
          {business.businessContext && (
            <Panel tone="neutral" title="Industry & Category Context">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{business.businessContext}</pre>
            </Panel>
          )}
        </div>
      )}

      {business.keywords.length > 0 && <KeywordGroups keywords={business.keywords} categories={business.keywordCategories} />}

      {business.insights && (
        <div className="space-y-4">
          <SectionHeading size="sm" title="Insights" />
          <Panel tone="info" title="Why they need a website">
            <p className="text-sm text-fg">{business.insights.whyNeedsWebsite}</p>
          </Panel>
          <Panel tone="warning" title="What's missing online">
            <p className="text-sm text-fg">{business.insights.whatsMissingOnline}</p>
          </Panel>
          <div>
            <p className="mb-2 text-xs font-medium text-fg-muted">Opportunities</p>
            <ul className="space-y-1.5">
              {business.insights.opportunities.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-fg-muted">
                  <span aria-hidden className="mt-0.5 text-primary">◆</span>{o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
