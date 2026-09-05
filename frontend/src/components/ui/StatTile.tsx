import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TONE, type Tone } from '../../lib/tones'

export function StatTile({
  label,
  value,
  sub,
  tone,
  size = 'lg',
  onClick,
  loading = false,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
  size?: 'lg' | 'sm'
  onClick?: () => void
  loading?: boolean
}) {
  const valueClass = cn('font-bold', size === 'lg' ? 'text-3xl' : 'text-xl', tone ? TONE[tone].strong : 'text-fg')
  const shell = size === 'lg' ? 'rounded-xl border bg-surface p-5 text-left shadow-card' : 'rounded-lg bg-surface-2 p-3 text-center'

  const body = size === 'lg' ? (
    <>
      <p className="mb-1 text-sm text-fg-muted">{label}</p>
      <p className={valueClass}>{loading ? '—' : value}</p>
      {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
    </>
  ) : (
    <>
      <p className={valueClass}>{loading ? '—' : value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{label}</p>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(shell, 'w-full transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary')}
      >
        {body}
      </button>
    )
  }
  return <div className={shell}>{body}</div>
}
