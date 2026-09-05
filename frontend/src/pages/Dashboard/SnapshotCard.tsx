import { Link } from 'react-router-dom'
import { useSnapshotMeta } from '../../hooks/useSnapshot'
import { formatDateTime, formatNumber } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { SectionHeading } from '../../components/ui/Heading'

/** Static build only: explains what this site is and what still needs the local app. */
export function SnapshotCard() {
  const { data } = useSnapshotMeta()

  return (
    <Card>
      <SectionHeading
        title="About this snapshot"
        description={data ? `Exported ${formatDateTime(data.exportedAt)} · ${formatNumber(data.total)} businesses` : 'Loading…'}
        className="mb-4"
      />
      <div className="space-y-3 text-sm text-fg-muted">
        <p>
          This is a read-only copy of the database published to GitHub Pages. Browse and search businesses, open any profile, and
          mark leads as shortlisted, contacted, interested, closed or rejected. Those marks and your notes are saved in this browser;
          use <strong className="text-fg">Local changes</strong> in the header to export them and apply them to the database.
        </p>
        <p>
          Scraping, re-scraping, AI analysis, website generation, profile edits and deletes only run in the local app. To refresh
          this site, export a new snapshot from the local app and push it.
        </p>
      </div>
      <div className="mt-4">
        <Link to="/businesses" className="text-sm font-medium text-primary hover:underline">Browse businesses →</Link>
      </div>
    </Card>
  )
}
