import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TONE } from '../../lib/tones'
import { useClickOutside } from '../../hooks/useClickOutside'

/** Anchored dropdown panel: closes on outside click and Escape. */
export function Popover({
  open,
  onOpenChange,
  trigger,
  align = 'start',
  role,
  className,
  panelClassName,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  align?: 'start' | 'end'
  role?: string
  className?: string
  panelClassName?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => onOpenChange(false), open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger}
      {open && (
        <div
          role={role}
          className={cn(
            'absolute z-30 mt-1 min-w-[10rem] rounded-xl border bg-surface py-1 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  onSelect,
  selected = false,
  disabled = false,
  tone = 'default',
  role = 'menuitem',
  className,
  children,
}: {
  onSelect: () => void
  selected?: boolean
  disabled?: boolean
  tone?: 'default' | 'danger'
  role?: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === 'option' ? selected : undefined}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        selected ? 'bg-primary-soft font-medium text-primary' : tone === 'danger' ? TONE.danger.text : 'text-fg-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}
