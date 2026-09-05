import { useScraperStatus, useStopScraper } from '../../hooks/useScraper'
import { getApiErrorMessage } from '../../lib/errors'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeading } from '../../components/ui/Heading'
import { ScrapeProgress } from './ScrapeProgress'
import { ScrapeForm } from './ScrapeForm'
import { LastSessionResults } from './LastSessionResults'

export function ScraperCard() {
  const { data: status } = useScraperStatus()
  const stop = useStopScraper()
  const running = status?.running ?? false

  return (
    <Card>
      <SectionHeading title="Scraper" className="mb-4" />

      {running && status ? (
        <div className="space-y-3">
          <ScrapeProgress status={status} />
          <Button variant="danger" loading={stop.isPending} onClick={() => stop.mutate()}>
            Stop Scraper
          </Button>
          {stop.isError && <Alert tone="danger">{getApiErrorMessage(stop.error)}</Alert>}
        </div>
      ) : (
        <ScrapeForm />
      )}

      {!running && status?.finishedAt && <LastSessionResults status={status} />}
    </Card>
  )
}
