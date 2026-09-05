import { useBusinessStats } from '../../hooks/useBusinesses'
import { formatNumber } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/ErrorState'
import { StatTile } from '../../components/ui/StatTile'

export function StatsGrid() {
  const { data, isPending, isError, error, refetch } = useBusinessStats()

  if (isError) {
    return (
      <Card>
        <ErrorState size="sm" error={error} message="Backend unreachable — stats unavailable." onRetry={() => void refetch()} />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatTile label="Total Businesses" value={formatNumber(data?.total)} loading={isPending} />
      <StatTile label="No Website" value={formatNumber(data?.noWebsite)} sub="potential leads" loading={isPending} />
      <StatTile label="Hot Leads" value={formatNumber(data?.byPriority.high)} sub="high priority" loading={isPending} />
      <StatTile label="Shortlisted" value={formatNumber(data?.byStatus.qualified)} sub="ready for outreach" loading={isPending} />
    </div>
  )
}
