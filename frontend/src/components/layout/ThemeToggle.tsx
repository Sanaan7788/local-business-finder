import { cn } from '../../lib/cn'
import { useDarkMode } from '../../context/DarkModeContext'

export function ThemeToggle() {
  const { dark, toggle } = useDarkMode()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={cn(
        'relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        dark ? 'bg-primary' : 'bg-line-strong',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs shadow transition-transform duration-300',
          dark ? 'translate-x-6' : 'translate-x-0.5',
        )}
      >
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
