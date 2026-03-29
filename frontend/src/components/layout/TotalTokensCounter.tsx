import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '../../lib/api'

export function TotalTokensCounter() {
  const { data } = useQuery({
    queryKey: ['settings', 'stats'],
    queryFn: settingsApi.getStats,
    refetchInterval: 60_000, // refresh every minute
  })

  const total = data?.totalTokensUsed ?? 0
  if (total === 0) return null

  const fmt = total >= 1_000_000
    ? `${(total / 1_000_000).toFixed(1)}M`
    : total >= 1_000
    ? `${(total / 1_000).toFixed(1)}k`
    : String(total)

  return (
    <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5" title={`${total.toLocaleString()} total tokens used`}>
      <span>⬡</span>
      <span className="font-medium">{fmt} tokens</span>
    </div>
  )
}
