import { cn } from '../../../lib/cn'
import { TONE } from '../../../lib/tones'
import type { CrawledPage } from '../../../types/business'

export function RawPagesDetails({ pages }: { pages: CrawledPage[] }) {
  return (
    <details className="overflow-hidden rounded-xl border">
      <summary className="cursor-pointer bg-surface-2 px-4 py-2.5 text-sm font-semibold text-fg-muted hover:text-fg">
        Raw Extracted Data ({pages.length} pages)
      </summary>
      <div className="max-h-[600px] space-y-4 overflow-y-auto border-t p-4">
        {pages.map((page, i) => (
          <div key={i} className="rounded-lg border bg-surface-2 p-3">
            <p className="mb-1 break-all font-mono text-xs text-primary">{page.url}</p>
            <p className="mb-1 text-xs font-medium text-fg">{page.title}</p>
            {page.navLinks.length > 0 && <p className="mb-1 text-xs text-fg-subtle">Nav: {page.navLinks.join(' · ')}</p>}
            {page.headings.length > 0 && <p className="mb-1 text-xs text-fg-muted">Headings: {page.headings.join(' / ')}</p>}
            {page.paragraphs.length > 0 && <p className="line-clamp-3 text-xs text-fg-subtle">{page.paragraphs.join(' ')}</p>}
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-fg-subtle">
              <span>{page.images} images</span>
              {page.hasContactForm && <span className={TONE.success.text}>✓ Contact form</span>}
              {page.hasPhone && <span className={TONE.success.text}>✓ Phone</span>}
              {page.hasEmail && <span className={cn(TONE.success.text)}>✓ Email</span>}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
