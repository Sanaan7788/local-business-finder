import { FormField, Input } from './Field'

export function EditableField({
  label,
  value,
  editing,
  onChange,
  type = 'text',
  placeholder,
  href,
}: {
  label: string
  value: string | number | null | undefined
  editing: boolean
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'url' | 'tel'
  placeholder?: string
  href?: string
}) {
  const display = value !== null && value !== undefined && value !== '' ? String(value) : null

  if (editing) {
    return (
      <FormField label={label}>
        {id => (
          <Input id={id} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? label} />
        )}
      </FormField>
    )
  }

  return (
    <div>
      <p className="mb-1 text-xs text-fg-muted">{label}</p>
      {display ? (
        href ? (
          <a href={href} target="_blank" rel="noreferrer" className="break-all text-sm text-primary hover:underline">{display}</a>
        ) : (
          <p className="text-sm font-medium text-fg">{display}</p>
        )
      ) : (
        <p className="text-sm text-fg-subtle">—</p>
      )}
    </div>
  )
}
