import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { TONE } from '../../lib/tones'

export const fieldClass =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, 'resize-y', className)} {...rest} />
}

/** Label + control + hint/error, with the label wired to the control by id. */
export function FormField({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-fg-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className={cn('mt-1 text-xs', TONE.danger.text)}>{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
