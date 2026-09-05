import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'xs' | 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  block?: boolean
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  link: 'text-primary hover:underline',
}

const SIZE: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-[38px] px-5 text-sm', // matches the input height
}

const LINK_SIZE: Record<Size, string> = { xs: 'text-xs', sm: 'text-sm', md: 'text-sm' }

export function Button({
  variant = 'secondary',
  size = 'sm',
  loading = false,
  block = false,
  className,
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'link' ? LINK_SIZE[size] : SIZE[size],
        VARIANT[variant],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
