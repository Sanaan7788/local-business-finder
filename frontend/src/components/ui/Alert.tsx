import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TONE, type Tone } from '../../lib/tones'

export function Alert({
  tone,
  title,
  action,
  className,
  children,
}: {
  tone: Tone
  title?: ReactNode
  action?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm', TONE[tone].panel, TONE[tone].text, className)}
    >
      <div className="min-w-0 flex-1">
        {title && <p className={cn('font-medium', TONE[tone].strong)}>{title}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
