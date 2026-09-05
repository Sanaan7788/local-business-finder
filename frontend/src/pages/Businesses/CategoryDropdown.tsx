import { useState } from 'react'
import { cn } from '../../lib/cn'
import { fieldClass, Input } from '../../components/ui/Field'
import { MenuItem, Popover } from '../../components/ui/Popover'
import type { CategoryCount } from '../../types/api'

export function CategoryDropdown({
  value,
  onChange,
  categories,
}: {
  value: string
  onChange: (v: string) => void
  categories: CategoryCount[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query ? categories.filter(c => c.category.toLowerCase().includes(query.toLowerCase())) : categories

  const select = (v: string) => { onChange(v); setOpen(false) }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      role="listbox"
      panelClassName="w-full overflow-hidden"
      trigger={
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Filter by category"
          onClick={() => { setOpen(o => !o); setQuery('') }}
          className={cn(fieldClass, 'flex items-center justify-between gap-2 text-left', !value && 'text-fg-subtle')}
        >
          <span className="truncate">{value || 'All Categories'}</span>
          <span aria-hidden className="shrink-0 text-fg-subtle">{open ? '▲' : '▼'}</span>
        </button>
      }
    >
      <div className="border-b p-2">
        <Input
          autoFocus
          aria-label="Search categories"
          placeholder="Search categories…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        <MenuItem role="option" selected={!value} onSelect={() => select('')}>All Categories</MenuItem>
        {filtered.map(({ category, count }) => (
          <MenuItem key={category} role="option" selected={value === category} onSelect={() => select(category)}>
            <span className="truncate">{category}</span>
            <span className="ml-2 shrink-0 text-xs text-fg-subtle">{count}</span>
          </MenuItem>
        ))}
        {filtered.length === 0 && <p className="px-3 py-2 text-sm text-fg-subtle">No matches</p>}
      </div>
    </Popover>
  )
}
