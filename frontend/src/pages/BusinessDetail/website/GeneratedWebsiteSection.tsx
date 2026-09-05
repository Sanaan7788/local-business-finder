import { useState } from 'react'
import { useGenerateWebsite } from '../../../hooks/useBusinesses'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatKB } from '../../../lib/format'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { CopyButton } from '../../../components/ui/CopyButton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SectionHeading } from '../../../components/ui/Heading'
import type { Business } from '../../../types/business'

export function GeneratedWebsiteSection({ business }: { business: Business }) {
  const generate = useGenerateWebsite()
  const [showCode, setShowCode] = useState(false)
  const html = business.generatedWebsiteCode

  const generateButton = (label: string, size: 'xs' | 'md' = 'xs') => (
    <Button variant={html ? 'secondary' : 'primary'} size={size} loading={generate.isPending} onClick={() => generate.mutate(business.id)}>
      {generate.isPending ? 'Generating… (may take 1–2 min)' : label}
    </Button>
  )

  return (
    <div className="space-y-4">
      <SectionHeading title="Generated Website" />

      {generate.isError && <Alert tone="danger">{getApiErrorMessage(generate.error)}</Alert>}

      {!html ? (
        <EmptyState
          title="No website generated yet."
          description="The AI writes a complete, self-contained HTML website from the saved prompt (or the default brief)."
          action={generateButton('Generate Website', 'md')}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="link" onClick={() => setShowCode(s => !s)}>{showCode ? 'Hide Code' : 'Show Code'}</Button>
            <CopyButton text={html} />
            {generateButton('Regenerate')}
            <span className="ml-auto text-xs text-fg-subtle">{formatKB(html.length)}</span>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-surface-2 px-3 py-1.5 text-xs text-fg-subtle">Preview</div>
            <iframe srcDoc={html} className="h-96 w-full bg-white" sandbox="allow-same-origin" title="Website preview" />
          </div>
          {showCode && (
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-green-400">{html}</pre>
          )}
        </>
      )}
    </div>
  )
}
