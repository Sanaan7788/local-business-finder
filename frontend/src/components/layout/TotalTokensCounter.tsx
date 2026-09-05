import { useTokenStats } from '../../hooks/useSettings'
import { formatCompact, formatNumber } from '../../lib/format'
import { Badge } from '../ui/Badge'

export function TotalTokensCounter() {
  const { data } = useTokenStats()
  const total = data?.totalTokensUsed ?? 0
  if (total === 0) return null

  return (
    <span title={`${formatNumber(total)} total tokens used`}>
      <Badge tone="purple">⬡ {formatCompact(total)} tokens</Badge>
    </span>
  )
}
