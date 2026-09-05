import { ServerOnly } from '../../../components/ServerOnly'
import { SectionHeading } from '../../../components/ui/Heading'
import type { Business } from '../../../types/business'
import { MenuUpload } from './MenuUpload'
import { MenuList } from './MenuList'

export function ScrapedDataSection({ business }: { business: Business }) {
  return (
    <div className="space-y-4 border-t pt-4">
      <SectionHeading size="sm" title="Scraped from Google Maps" />

      {business.reviewSnippets.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">Customer Reviews ({business.reviewSnippets.length})</p>
          <div className="space-y-1.5">
            {business.reviewSnippets.map((snippet, i) => (
              <p key={i} className="rounded-lg border bg-surface-2 px-3 py-2 text-sm italic text-fg-muted">"{snippet}"</p>
            ))}
          </div>
        </div>
      )}

      <ServerOnly>
        <MenuUpload businessId={business.id} />
      </ServerOnly>

      {business.menu.length > 0 && <MenuList menu={business.menu} />}
    </div>
  )
}
