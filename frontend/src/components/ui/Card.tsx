import type { ElementType, HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const PADDING = { none: '', sm: 'p-3', md: 'p-4 sm:p-5' } as const

export function Card({
  padding = 'md',
  as,
  className,
  ...rest
}: { padding?: keyof typeof PADDING; as?: ElementType } & HTMLAttributes<HTMLElement>) {
  const Tag: ElementType = as ?? 'div'
  return <Tag className={cn('rounded-xl border bg-surface shadow-card', PADDING[padding], className)} {...rest} />
}
