import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function EmptyState({
  title,
  description,
  action,
  footnote,
  size = 'md',
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  footnote?: ReactNode
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('text-center', size === 'md' ? 'py-12' : 'py-6')}>
      <p className="font-medium text-fg-muted">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-fg-subtle">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
      {footnote && <p className="mt-2 text-xs text-fg-subtle">{footnote}</p>}
    </div>
  )
}
