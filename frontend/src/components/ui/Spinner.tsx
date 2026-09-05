import { cn } from '../../lib/cn'

export function Spinner({ size = 'sm', label = 'Loading', className }: { size?: 'sm' | 'md'; label?: string; className?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent',
        size === 'sm' ? 'h-3.5 w-3.5 border-current' : 'h-8 w-8 border-primary',
        className,
      )}
    />
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-sm text-fg-subtle">
      <Spinner size="md" label={label} />
      <span>{label}</span>
    </div>
  )
}
