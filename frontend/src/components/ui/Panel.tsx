import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TONE, type Tone } from '../../lib/tones'

/** A tinted section with a header strip — summaries, briefs, analysis blocks. */
export function Panel({
  tone = 'neutral',
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  tone?: Tone
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  const t = TONE[tone]
  return (
    <section className={cn('overflow-hidden rounded-xl border', t.panel, className)}>
      <header className={cn('flex items-center justify-between gap-3 border-b border-inherit px-4 py-2.5', t.panelHead)}>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className={cn('mt-0.5 text-xs', t.text)}>{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
