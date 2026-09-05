import { cn } from '../../lib/cn'
import { TONE, type Tone } from '../../lib/tones'

export function ProgressBar({ value, tone = 'info', label }: { value: number; tone?: Tone; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-fg/10"
    >
      <div className={cn('h-full rounded-full transition-all duration-500', TONE[tone].bar)} style={{ width: `${v}%` }} />
    </div>
  )
}
