import { useNavigate } from 'react-router-dom'
import { useBusinessStats } from '../../hooks/useBusinesses'
import { formatNumber } from '../../lib/format'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '../../lib/leads'
import { Card } from '../../components/ui/Card'
import { SectionHeading } from '../../components/ui/Heading'
import { StatTile } from '../../components/ui/StatTile'

export function PipelineStatus() {
  const navigate = useNavigate()
  const { data } = useBusinessStats()
  if (!data || data.total === 0) return null

  return (
    <Card>
      <SectionHeading title="Pipeline Status" className="mb-4" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {LEAD_STATUSES.map(status => (
          <StatTile
            key={status}
            size="sm"
            label={LEAD_STATUS_LABELS[status]}
            value={formatNumber(data.byStatus[status])}
            onClick={() => navigate(`/businesses?leadStatus=${status}`)}
          />
        ))}
      </div>
    </Card>
  )
}
