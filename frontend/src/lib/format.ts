// Formatting helpers — the only place dates and numbers are stringified.

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : '—'
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFmt.format(new Date(iso)) : '—'
}

export function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString()
}

/** 1234 → "1.2k", 3_400_000 → "3.4M" */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function formatKB(chars: number): string {
  return `${Math.round(chars / 1024)}KB`
}
