import { useSnapshotMeta } from '../../hooks/useSnapshot'
import { formatDate, formatDateTime } from '../../lib/format'
import { Badge } from '../ui/Badge'

/** Static build only: when the published data was exported. */
export function SnapshotBadge() {
  const { data } = useSnapshotMeta()
  if (!data) return null

  return (
    <span className="hidden sm:inline-flex" title={`Read-only snapshot exported ${formatDateTime(data.exportedAt)}`}>
      <Badge tone="neutral">Snapshot · {formatDate(data.exportedAt)}</Badge>
    </span>
  )
}
