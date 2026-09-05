import { Badge } from '../ui/Badge'
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES, PRIORITY_TONES } from '../../lib/leads'
import type { LeadStatus, Priority } from '../../types/business'

export function PriorityBadge({ priority, score }: { priority: Priority; score?: number }) {
  return (
    <Badge tone={PRIORITY_TONES[priority]}>
      {priority}
      {score !== undefined && ` (${score})`}
    </Badge>
  )
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={LEAD_STATUS_TONES[status]}>{LEAD_STATUS_LABELS[status]}</Badge>
}
