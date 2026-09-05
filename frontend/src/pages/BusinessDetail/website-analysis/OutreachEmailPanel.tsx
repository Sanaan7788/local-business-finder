import { useGenerateOutreachEmail } from '../../../hooks/useBusinesses'
import { IS_STATIC, serverOnly } from '../../../lib/env'
import { getApiErrorMessage } from '../../../lib/errors'
import { Alert } from '../../../components/ui/Alert'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { CopyButton } from '../../../components/ui/CopyButton'
import { Panel } from '../../../components/ui/Panel'
import type { Business } from '../../../types/business'

export function OutreachEmailPanel({ business }: { business: Business }) {
  const generate = useGenerateOutreachEmail()
  const email = business.outreach?.email ?? null
  const emails = business.scrapedEmails

  return (
    <Panel
      tone="info"
      title="Outreach Email"
      description="Personalised cold email based on the improvement opportunities above"
      action={serverOnly(
        <Button variant="primary" size="xs" loading={generate.isPending} onClick={() => generate.mutate(business.id)}>
          {generate.isPending ? 'Generating…' : email ? 'Regenerate' : 'Generate Email'}
        </Button>,
      )}
      bodyClassName="space-y-4 p-4"
    >
      {emails.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">Email addresses found on their website:</p>
          <div className="flex flex-wrap gap-2">
            {emails.map(e => (
              <Badge key={e} tone="neutral" size="sm" className="font-mono">
                {e}
                <CopyButton text={e} variant="ghost" copiedLabel="✓" aria-label={`Copy ${e}`} className="-mr-1 h-5 px-1" />
              </Badge>
            ))}
          </div>
        </div>
      ) : email ? (
        <Alert tone="warning">No email addresses were found on the website — find the owner's contact manually before sending.</Alert>
      ) : (
        <p className="text-xs text-fg-subtle">No email addresses found on the website. You may need to find the owner's email manually.</p>
      )}

      {generate.isError && <Alert tone="danger">{getApiErrorMessage(generate.error, 'Generation failed')}</Alert>}

      {IS_STATIC && !email && (
        <p className="text-xs text-fg-subtle">No outreach email was generated before this snapshot was exported. Generate it in the local app.</p>
      )}

      {email && (
        <div className="space-y-3">
          <Card padding="sm">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-fg-muted">Subject</p>
              <CopyButton text={email.subject} copiedLabel="✓ Copied" />
            </div>
            <p className="text-sm font-medium text-fg">{email.subject}</p>
          </Card>
          <Card padding="sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-fg-muted">Email body</p>
              <CopyButton text={email.body} copiedLabel="✓ Copied" />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{email.body}</pre>
          </Card>
        </div>
      )}
    </Panel>
  )
}
