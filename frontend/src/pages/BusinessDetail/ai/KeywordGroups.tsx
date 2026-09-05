import { cn } from '../../../lib/cn'
import { TONE, type Tone } from '../../../lib/tones'
import { Badge } from '../../../components/ui/Badge'
import { CopyButton } from '../../../components/ui/CopyButton'
import { SectionHeading } from '../../../components/ui/Heading'
import type { Keywords } from '../../../types/business'

const KEYWORD_GROUPS: { key: keyof Keywords; label: string; tone: Tone }[] = [
  { key: 'serviceKeywords', label: 'Services', tone: 'info' },
  { key: 'locationKeywords', label: 'Location', tone: 'success' },
  { key: 'reputationKeywords', label: 'Reputation', tone: 'purple' },
  { key: 'searchPhrases', label: 'Search Phrases', tone: 'warning' },
]

export function KeywordGroups({ keywords, categories }: { keywords: string[]; categories: Keywords | null }) {
  return (
    <div className="space-y-4">
      <SectionHeading size="sm" title="Keywords" action={<CopyButton text={keywords.join(', ')} label="Copy All" variant="secondary" />} />

      {categories ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {KEYWORD_GROUPS.map(({ key, label, tone }) => {
            const group = categories[key]
            if (group.length === 0) return null
            return (
              <div key={key} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span aria-hidden className={cn('h-2 w-2 rounded-full', TONE[tone].dot)} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
                  <span className="ml-auto text-xs text-fg-subtle">{group.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.map(k => <Badge key={k} tone={tone}>{k}</Badge>)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map(k => <Badge key={k} tone="info" size="sm">{k}</Badge>)}
        </div>
      )}

      <div className="rounded-lg border bg-surface-2 p-3">
        <p className="mb-1 text-xs font-medium text-fg-muted">All keywords — comma-separated</p>
        <p className="break-words font-mono text-xs leading-relaxed text-fg-muted">{keywords.join(', ')}</p>
      </div>
    </div>
  )
}
