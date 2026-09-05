import { Link } from 'react-router-dom'
import { useScraperCompletionSync, useScraperStatus } from '../../hooks/useScraper'
import { Badge } from '../ui/Badge'

/** Shows a live pill while a scrape runs; also hosts the completion sync. */
export function ScraperStatusPill() {
  useScraperCompletionSync()
  const { data } = useScraperStatus()
  if (!data?.running) return null

  return (
    <Link to="/" className="hidden sm:block" title="Scrape in progress — open the dashboard">
      <Badge tone="info">
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        Scraping {data.category ?? ''} · {data.saved} saved
      </Badge>
    </Link>
  )
}
