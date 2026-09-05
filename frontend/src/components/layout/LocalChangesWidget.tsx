import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalChanges } from '../../hooks/useLocalChanges'
import { useSnapshotMeta } from '../../hooks/useSnapshot'
import { qk } from '../../hooks/queryKeys'
import { clearChanges, exportChanges, importChanges, parseChangesFile, subscribe } from '../../lib/api/static/overlay'
import { cn } from '../../lib/cn'
import { TONE } from '../../lib/tones'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { MenuItem, Popover } from '../ui/Popover'

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/**
 * Static build only: shows how many status/notes edits live in this browser and
 * lets the user export them for `npm run import:changes`, import a file from
 * another browser, or discard them.
 */
export function LocalChangesWidget() {
  const qc = useQueryClient()
  const { count } = useLocalChanges()
  const { data: meta } = useSnapshotMeta()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Every overlay change (own edits, import, reset, another tab) re-reads the snapshot queries.
  useEffect(() => subscribe(() => void qc.invalidateQueries({ queryKey: qk.businesses.all })), [qc])

  const onExport = () => {
    downloadJson(`lbf-changes-${new Date().toISOString().slice(0, 10)}.json`, exportChanges(meta?.exportedAt))
    setOpen(false)
  }

  const onImport = async (file: File) => {
    try {
      const merged = importChanges(parseChangesFile(await file.text()))
      setMessage({ tone: 'success', text: `Imported ${merged} change${merged === 1 ? '' : 's'}` })
    } catch (err) {
      setMessage({ tone: 'danger', text: err instanceof Error ? err.message : 'Import failed' })
    }
  }

  const onReset = () => {
    if (!window.confirm(`Discard all ${count} local change${count === 1 ? '' : 's'}? The snapshot values come back.`)) return
    clearChanges()
    setMessage(null)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={next => { setOpen(next); if (!next) setMessage(null) }}
      align="end"
      role="menu"
      panelClassName="w-72"
      trigger={
        <Button variant="secondary" size="xs" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', count > 0 ? TONE.warning.dot : 'bg-line-strong')} />
          {count} local change{count === 1 ? '' : 's'}
          <span aria-hidden className="text-fg-subtle">▾</span>
        </Button>
      }
    >
      <p className="border-b px-3 py-1.5 text-xs text-fg-subtle">
        Status and notes edits are saved in this browser only. Export them to apply to the database.
      </p>
      {message && (
        <div className="p-2">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}
      <MenuItem disabled={count === 0} onSelect={onExport}>Export as JSON…</MenuItem>
      <MenuItem onSelect={() => fileInput.current?.click()}>Import JSON…</MenuItem>
      <MenuItem tone="danger" disabled={count === 0} onSelect={onReset}>Discard all changes</MenuItem>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Import local changes"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void onImport(file)
        }}
      />
    </Popover>
  )
}
