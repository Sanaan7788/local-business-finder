import { PageHeader } from '../../components/ui/Heading'
import { IS_STATIC } from '../../lib/env'
import { StatsGrid } from './StatsGrid'
import { PipelineStatus } from './PipelineStatus'
import { ScraperCard } from './ScraperCard'
import { SnapshotCard } from './SnapshotCard'

export default function Dashboard() {
  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader title="Dashboard" description="Overview of your lead pipeline" />
      <StatsGrid />
      <PipelineStatus />
      {IS_STATIC ? <SnapshotCard /> : <ScraperCard />}
    </div>
  )
}
