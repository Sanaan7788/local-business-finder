import { useState } from 'react'
import { MenuItem, Popover } from '../../components/ui/Popover'

export function RowMenu({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
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
        <MenuItem tone="danger" onSelect={() => { setOpen(false); onDelete() }}>Delete</MenuItem>
      </Popover>
    </div>
  )
}
