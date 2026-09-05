import { cn } from '../../lib/cn'
import { getApiErrorMessage } from '../../lib/errors'
import { TONE } from '../../lib/tones'
import { Button } from './Button'

export function ErrorState({
  error,
  message,
  onRetry,
  size = 'md',
}: {
  error?: unknown
  message?: string
  onRetry?: () => void
  size?: 'sm' | 'md'
}) {
  return (
    <div role="alert" className={cn('text-center', size === 'md' ? 'py-12' : 'py-6')}>
      <p className={cn('font-medium', TONE.danger.text)}>{message ?? getApiErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="xs" onClick={onRetry} className="mt-3">
          Retry
        </Button>
      )}
    </div>
  )
}
