import { useMemo, useRef, useState } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Badge } from '../../components/ui/Badge'
import { MenuItem } from '../../components/ui/Popover'

// Google Maps search terms, grouped for readability
const ALL_CATEGORIES = [
  // Food & Drink (consolidated)
  'food',
  // Beauty & Personal Care
  'nail salons', 'hair salons', 'barbershops', 'spas', 'massage therapy',
  'tattoo shops', 'tanning salons', 'eyebrow threading', 'lash studios', 'makeup artists',
  // Home Services
  'plumbers', 'electricians', 'hvac', 'roofing', 'landscaping', 'lawn care',
  'house cleaning', 'pest control', 'painting contractors', 'handyman services',
  'carpet cleaning', 'window cleaning', 'pool service', 'moving companies',
  'interior designers', 'general contractors',
  // Auto
  'auto repair', 'oil change', 'car wash', 'tire shops', 'auto body shops',
  'transmission repair', 'towing', 'auto detailing', 'windshield repair',
  // Health & Medical
  'dentists', 'dental clinics', 'chiropractors', 'physical therapy', 'optometrists', 'urgent care',
  'veterinarians', 'acupuncture', 'mental health counseling', 'pediatricians',
  // Retail
  'clothing stores', 'shoe stores', 'jewelry stores', 'flower shops',
  'gift shops', 'bookstores', 'electronics stores', 'furniture stores',
  'sporting goods stores', 'toy stores', 'pet stores',
  // Professional Services
  'law firms', 'accounting', 'insurance agencies', 'real estate agencies',
  'financial advisors', 'marketing agencies', 'photography studios', 'printing services',
  'notary public', 'tax preparation',
  // Fitness
  'gyms', 'yoga studios', 'pilates studios', 'martial arts', 'personal trainers',
  'dance studios', 'crossfit',
  // Other
  'hotels', 'car rentals', 'laundromats', 'storage units', 'pharmacies',
  'dry cleaning', 'tutoring', 'child care', 'event venues', 'churches',
  'phone repair',
]

export function CategoryTagInput({ id, selected, onChange }: { id?: string; selected: string[]; onChange: (v: string[]) => void }) {
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapRef, () => setOpen(false), open)

  const filtered = useMemo(() => {
    const q = inputValue.toLowerCase().trim()
    return ALL_CATEGORIES.filter(c => !selected.includes(c) && (!q || c.includes(q)))
  }, [inputValue, selected])

  const add = (cat: string) => {
    if (!selected.includes(cat)) onChange([...selected, cat])
    setInputValue('')
    setOpen(false)
  }

  const remove = (cat: string) => onChange(selected.filter(c => c !== cat))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const custom = inputValue.trim().toLowerCase()
      if (filtered.length > 0) add(filtered[0])
      else if (custom) add(custom)
    } else if (e.key === 'Backspace' && !inputValue && selected.length > 0) {
      remove(selected[selected.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary"
        onClick={() => { inputRef.current?.focus(); setOpen(true) }}
      >
        {selected.map(cat => (
          <Badge key={cat} tone="info" onRemove={() => remove(cat)} removeLabel={`Remove ${cat}`} className="capitalize">
            {cat}
          </Badge>
        ))}
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={selected.length === 0 ? 'e.g. nail salons, restaurants, plumbers…' : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>

      {open && (
        <div role="listbox" className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-surface py-1 shadow-pop">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-fg-subtle">No match — press Enter to use a custom category</p>
          ) : (
            filtered.map(cat => (
              <MenuItem key={cat} role="option" onSelect={() => add(cat)} className="py-1.5 capitalize">
                {cat}
              </MenuItem>
            ))
          )}
        </div>
      )}
    </div>
  )
}
