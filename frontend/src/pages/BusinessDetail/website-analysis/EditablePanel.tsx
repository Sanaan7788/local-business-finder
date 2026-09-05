import { useState } from 'react'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '../../../lib/errors'
import { cn } from '../../../lib/cn'
import { TONE, type Tone } from '../../../lib/tones'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Field'
import { Panel } from '../../../components/ui/Panel'

/** A Panel whose body can be swapped for a textarea and saved. `readOnly` hides the edit affordance. */
export function EditablePanel({
  tone,
  title,
  description,
  value,
  onSave,
  saving,
  error,
  rows = 12,
  mono = false,
  hint,
  readOnly = false,
  children,
}: {
  tone: Tone
  title: ReactNode
  description?: ReactNode
  value: string
  onSave: (value: string) => Promise<unknown>
  saving: boolean
  error?: unknown
  rows?: number
  mono?: boolean
  hint?: string
  readOnly?: boolean
  children: ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => { setDraft(value); setEditing(true) }
  const save = async () => { await onSave(draft); setEditing(false) }

  return (
    <Panel
      tone={tone}
      title={title}
      description={description}
      action={
        readOnly ? undefined : (
          <Button variant="link" onClick={() => (editing ? setEditing(false) : startEdit())}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        )
      }
    >
      {editing && !readOnly ? (
        <div className="space-y-2">
          {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
          <Textarea
            aria-label={typeof title === 'string' ? title : 'Content'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={rows}
            className={mono ? 'font-mono' : undefined}
          />
          <div className="flex items-center gap-3">
            <Button variant="primary" size="xs" loading={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {error ? <span className={cn('text-xs', TONE.danger.text)}>{getApiErrorMessage(error)}</span> : null}
          </div>
        </div>
      ) : (
        children
      )}
    </Panel>
  )
}
