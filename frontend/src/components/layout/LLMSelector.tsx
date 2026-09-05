import { useEffect, useRef, useState } from 'react'
import { LLM_PROVIDER_STORAGE_KEY, useLlmSettings, useSetLlmProvider } from '../../hooks/useSettings'
import { getApiErrorMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'
import { TONE } from '../../lib/tones'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { MenuItem, Popover } from '../ui/Popover'

export function LLMSelector() {
  const { data } = useLlmSettings()
  const setProvider = useSetLlmProvider()
  const [open, setOpen] = useState(false)
  const reconciled = useRef(false)

  // The backend keeps the active provider in memory only, so after a restart it
  // falls back to LLM_PROVIDER. Re-apply the last choice once, if it is usable.
  useEffect(() => {
    if (!data || reconciled.current) return
    reconciled.current = true
    let saved: string | null = null
    try { saved = localStorage.getItem(LLM_PROVIDER_STORAGE_KEY) } catch { /* ignore */ }
    if (!saved || saved === data.active) return
    const usable = data.providers.some(p => p.id === saved && p.configured)
    if (usable) setProvider.mutate(saved)
    else try { localStorage.removeItem(LLM_PROVIDER_STORAGE_KEY) } catch { /* ignore */ }
  }, [data, setProvider])

  const active = data?.providers.find(p => p.id === data.active)

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      role="menu"
      panelClassName="w-64"
      trigger={
        <Button
          variant="secondary"
          size="xs"
          loading={setProvider.isPending}
          disabled={!data}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', TONE.success.dot)} />
          {active?.label ?? 'LLM'}
          <span aria-hidden className="text-fg-subtle">▾</span>
        </Button>
      }
    >
      <p className="border-b px-3 py-1.5 text-xs text-fg-subtle">Select LLM provider</p>
      {setProvider.isError && (
        <div className="p-2">
          <Alert tone="danger">{getApiErrorMessage(setProvider.error)}</Alert>
        </div>
      )}
      {data?.providers.map(p => (
        <MenuItem
          key={p.id}
          selected={p.id === data.active}
          disabled={!p.configured}
          onSelect={() => { setOpen(false); setProvider.mutate(p.id) }}
          className="flex-col items-stretch gap-0.5"
        >
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', p.configured ? TONE.success.dot : 'bg-line-strong')} />
              {p.label}
            </span>
            {!p.configured && <span className="text-xs text-fg-subtle">not configured</span>}
          </span>
          <span className="pl-3.5 text-xs font-normal text-fg-subtle">{p.model} · {p.free}</span>
        </MenuItem>
      ))}
    </Popover>
  )
}
