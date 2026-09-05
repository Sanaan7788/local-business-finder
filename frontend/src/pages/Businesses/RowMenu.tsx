import { useState } from 'react'
import { LEAD_STATUS_TRANSITIONS } from '../../lib/leads'
import { MenuItem, Popover } from '../../components/ui/Popover'
import type { LeadStatus } from '../../types/business'

interface QuickAction {
  label: string
  to: LeadStatus
  tone?: 'danger'
}

/** Status moves offered from the list — the same transition table the CRM tab uses. */
function quickActions(status: LeadStatus): QuickAction[] {
  const allowed = LEAD_STATUS_TRANSITIONS[status]
  const actions: QuickAction[] = []
  if (allowed.includes('qualified')) actions.push({ label: '★ Shortlist', to: 'qualified' })
  if (allowed.includes('new')) actions.push({ label: status === 'qualified' ? 'Remove from shortlist' : 'Restore to New', to: 'new' })
  if (allowed.includes('rejected')) actions.push({ label: '✕ Reject', to: 'rejected', tone: 'danger' })
  return actions
}

export function RowMenu({
  name,
  status,
  onStatus,
  onDelete,
}: {
  name: string
  status: LeadStatus
  onStatus: (next: LeadStatus) => void
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(false)
  const actions = quickActions(status)

  return (
    <div onClick={e => e.stopPropagation()}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="end"
        role="menu"
        trigger={
          <button
            type="button"
            aria-label={`Actions for ${name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-lg font-bold leading-none text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ⋮
          </button>
        }
      >
        {actions.map(a => (
          <MenuItem key={a.to} tone={a.tone} onSelect={() => { setOpen(false); onStatus(a.to) }}>{a.label}</MenuItem>
        ))}
        {onDelete && (
          <MenuItem tone="danger" className={actions.length > 0 ? 'border-t' : undefined} onSelect={() => { setOpen(false); onDelete() }}>Delete</MenuItem>
        )}
        {actions.length === 0 && !onDelete && <p className="px-3 py-2 text-xs text-fg-subtle">No actions available</p>}
      </Popover>
    </div>
  )
}
