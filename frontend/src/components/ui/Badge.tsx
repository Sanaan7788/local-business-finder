import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TONE, type Tone } from '../../lib/tones'

export function Badge({
  tone = 'neutral',
  size = 'xs',
  onRemove,
  removeLabel = 'Remove',
  className,
  children,
}: {
  tone?: Tone
  size?: 'xs' | 'sm'
  onRemove?: () => void
  removeLabel?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'xs' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        TONE[tone].badge,
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onRemove() }}
          aria-label={removeLabel}
          className="-mr-1 rounded-full px-1 leading-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
        >
          ×
        </button>
      )}
    </span>
  )
}
