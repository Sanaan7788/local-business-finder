import { useGenerateContentBrief } from '../../../hooks/useBusinesses'
import { IS_STATIC, serverOnly } from '../../../lib/env'
import { getApiErrorMessage } from '../../../lib/errors'
import { ServerOnly } from '../../../components/ServerOnly'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { CopyButton } from '../../../components/ui/CopyButton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SectionHeading } from '../../../components/ui/Heading'
import { Panel } from '../../../components/ui/Panel'
import type { Business } from '../../../types/business'

export function ContentBriefTab({ business }: { business: Business }) {
  const generate = useGenerateContentBrief()
  const brief = business.contentBrief
  const hasWebsiteAnalysis = Boolean(business.websiteAnalysis)

  // Stale when the website was analysed after the brief was generated (or the brief is undated)
  const crawledAt = business.websiteAnalysis?.crawledAt ? new Date(business.websiteAnalysis.crawledAt) : null
  const generatedAt = brief?.generatedAt ? new Date(brief.generatedAt) : null
  const stale = hasWebsiteAnalysis && (!generatedAt || (crawledAt !== null && crawledAt > generatedAt))

  const generateButton = (label: string, pendingLabel: string, size: 'xs' | 'md' = 'xs') => (
    <Button variant="primary" size={size} loading={generate.isPending} onClick={() => generate.mutate(business.id)}>
      {generate.isPending ? pendingLabel : label}
    </Button>
  )

  if (!brief) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No content brief generated yet."
          description={
            IS_STATIC
              ? 'No content brief was generated before this snapshot was exported. Generate it in the local app.'
              : 'The content brief describes the business in detail — what it sells, what customers love, and reasonable assumptions. It feeds directly into website generation.'
          }
          action={serverOnly(generateButton('Generate Content Brief', 'Generating…', 'md'))}
          footnote={serverOnly('Run AI Analysis first for best results (keywords + summary improve the brief).')}
        />
        <ServerOnly>
          {hasWebsiteAnalysis && (
            <Alert tone="info">Website analysis is available — generating now will include the crawled site content in confirmed facts.</Alert>
          )}
        </ServerOnly>
        {generate.isError && <Alert tone="danger">{getApiErrorMessage(generate.error)}</Alert>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {stale && (
        <Alert tone="warning" action={serverOnly(generateButton('Regenerate Now', 'Regenerating…'))}>
          The website was analysed after this brief was generated — regenerate to include the crawled site content in confirmed facts.
        </Alert>
      )}

      <SectionHeading
        title="Content Brief"
        description="Feeds into website generation. Confirmed facts are used as real content; assumptions fill gaps."
        action={serverOnly(generateButton('Regenerate', 'Regenerating…'))}
      />

      {generate.isError && <Alert tone="danger">{getApiErrorMessage(generate.error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel tone="success" title="Confirmed Facts" description="What we actually know from the data" action={<CopyButton text={brief.confirmedFacts} variant="secondary" />}>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{brief.confirmedFacts}</pre>
        </Panel>
        <Panel tone="warning" title="Intelligent Assumptions" description="Reasonable inferences — not confirmed" action={<CopyButton text={brief.assumptions} variant="secondary" />}>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{brief.assumptions}</pre>
        </Panel>
      </div>
    </div>
  )
}
