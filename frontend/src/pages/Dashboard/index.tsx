import { PageHeader } from '../../components/ui/Heading'
import { StatsGrid } from './StatsGrid'
import { PipelineStatus } from './PipelineStatus'
import { ScraperCard } from './ScraperCard'

export default function Dashboard() {
  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader title="Dashboard" description="Overview of your lead pipeline" />
      <StatsGrid />
      <PipelineStatus />
      <ScraperCard />
    </div>
  )
}
