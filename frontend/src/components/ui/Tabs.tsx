import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem<K extends string> {
  key: K
  label: ReactNode
  badge?: ReactNode
}

export function Tabs<K extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  className,
  'aria-label': ariaLabel,
}: {
  items: TabItem<K>[]
  value: K
  onChange: (key: K) => void
  variant?: 'underline' | 'pills'
  className?: string
  'aria-label': string
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const idx = items.findIndex(i => i.key === value)
    const next = items[(idx + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length]
    onChange(next.key)
    ;(e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.key}"]`))?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn('flex', variant === 'underline' ? 'gap-0 border-b' : 'flex-wrap gap-1', className)}
    >
      {items.map(item => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            data-tab={item.key}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none',
              variant === 'underline'
                ? cn(
                    '-mb-px border-b-2 px-4 py-2.5 focus-visible:bg-surface-2',
                    active ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg',
                  )
                : cn(
                    'rounded-lg px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary',
                    active ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-fg-muted hover:text-fg',
                  ),
            )}
          >
            {item.label}
            {item.badge}
          </button>
        )
      })}
    </div>
  )
}
