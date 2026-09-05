// ---------------------------------------------------------------------------
// Status hues. The only file that contains raw palette colours or `dark:`
// variants — every toned surface in the app (badges, alerts, panels, stat
// tiles, progress bars) reads its classes from here.
// ---------------------------------------------------------------------------

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple'

export interface ToneClasses {
  badge: string      // soft pill: background + text
  panel: string      // tinted container: border + background
  panelHead: string  // header strip of a Panel
  text: string       // body text in that tone
  strong: string     // heading / number text in that tone
  dot: string        // status dot
  bar: string        // progress fill
}

export const TONE: Record<Tone, ToneClasses> = {
  neutral: {
    badge: 'bg-surface-2 text-fg-muted',
    panel: 'border-line bg-surface-2/60',
    panelHead: 'bg-surface-2 text-fg',
    text: 'text-fg-muted',
    strong: 'text-fg',
    dot: 'bg-slate-400',
    bar: 'bg-slate-500',
  },
  info: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    panel: 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10',
    panelHead: 'bg-blue-100/60 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100',
    text: 'text-blue-700 dark:text-blue-300',
    strong: 'text-blue-900 dark:text-blue-100',
    dot: 'bg-blue-500',
    bar: 'bg-blue-600 dark:bg-blue-500',
  },
  success: {
    badge: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
    panel: 'border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10',
    panelHead: 'bg-green-100/60 text-green-900 dark:bg-green-500/15 dark:text-green-100',
    text: 'text-green-700 dark:text-green-300',
    strong: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
    bar: 'bg-green-600 dark:bg-green-500',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    panel: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    panelHead: 'bg-amber-100/60 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100',
    text: 'text-amber-700 dark:text-amber-300',
    strong: 'text-amber-800 dark:text-amber-200',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    panel: 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
    panelHead: 'bg-red-100/60 text-red-900 dark:bg-red-500/15 dark:text-red-100',
    text: 'text-red-700 dark:text-red-300',
    strong: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
    bar: 'bg-red-600 dark:bg-red-500',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
    panel: 'border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10',
    panelHead: 'bg-purple-100/60 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100',
    text: 'text-purple-700 dark:text-purple-300',
    strong: 'text-purple-800 dark:text-purple-200',
    dot: 'bg-purple-500',
    bar: 'bg-purple-600 dark:bg-purple-500',
  },
}
