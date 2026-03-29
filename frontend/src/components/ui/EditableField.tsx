export interface EditableFieldProps {
  label: string
  value: string | number | null | undefined
  editing: boolean
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'url' | 'tel'
  placeholder?: string
  href?: string
}

export function EditableField({
  label,
  value,
  editing,
  onChange,
  type = 'text',
  placeholder,
  href,
}: EditableFieldProps) {
  const display = value !== null && value !== undefined && value !== '' ? String(value) : null

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : display ? (
        href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{display}</a>
        ) : (
          <p className="text-sm font-medium text-gray-900">{display}</p>
        )
      ) : (
        <p className="text-sm text-gray-400">—</p>
      )}
    </div>
  )
}
