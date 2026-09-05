import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function PageHeader({
  title,
  description,
  actions,
  backTo,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  backTo?: string | -1
}) {
  const navigate = useNavigate()
  return (
    <div>
      {backTo !== undefined && (
        <Button
          variant="ghost"
          size="xs"
          className="mb-3 -ml-2"
          onClick={() => (typeof backTo === 'number' ? navigate(backTo) : navigate(backTo))}
        >
          ← Back
        </Button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  size = 'md',
  as: Tag = 'h2',
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  size?: 'sm' | 'md'
  as?: 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <Tag className={size === 'sm' ? 'text-xs font-semibold uppercase tracking-wide text-fg-subtle' : 'text-base font-semibold text-fg'}>
          {title}
        </Tag>
        {description && <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
