import { useState } from 'react'
import { useScrapeHistory } from '../../hooks/useScraper'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/Heading'
import { LoadingBlock } from '../../components/ui/Spinner'
import { SessionRow } from './SessionRow'

export default function ScraperHistory() {
  const { data: sessions, isPending, isError, error, refetch } = useScrapeHistory()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader title="Scrape History" description="All past scraping sessions and the locations covered" />

      {isPending ? (
        <Card padding="none"><LoadingBlock /></Card>
      ) : isError ? (
        <Card padding="none"><ErrorState error={error} onRetry={() => void refetch()} /></Card>
      ) : sessions.length === 0 ? (
        <Card padding="none"><EmptyState title="No sessions yet" description="Run the scraper to get started." /></Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(s => (
            <SessionRow key={s.id} session={s} expanded={selected === s.id} onToggle={() => setSelected(selected === s.id ? null : s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
