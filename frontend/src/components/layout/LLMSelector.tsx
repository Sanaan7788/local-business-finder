import { useState, useEffect, useRef } from 'react'
import { settingsApi, type ProviderInfo } from '../../lib/api'

const LS_KEY = 'llm_provider'

export function LLMSelector() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [active, setActive] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    settingsApi.getLlm().then(data => {
      setProviders(data.providers)
      const saved = localStorage.getItem(LS_KEY)
      const initial = saved ?? data.active
      setActive(initial)
      // Sync backend if localStorage had a different value
      if (saved && saved !== data.active) {
        settingsApi.setLlm(saved).catch(() => {
          // If saved provider isn't configured, fall back to backend default
          setActive(data.active)
          localStorage.removeItem(LS_KEY)
        })
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = async (id: string) => {
    setSaving(true)
    setOpen(false)
    try {
      await settingsApi.setLlm(id)
      setActive(id)
      localStorage.setItem(LS_KEY, id)
    } catch (e: any) {
      alert(e.response?.data?.error ?? e.message)
    } finally {
      setSaving(false)
    }
  }

  const activeInfo = providers.find(p => p.id === active)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving || providers.length === 0}
        className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="text-gray-700 font-medium">{activeInfo?.label ?? active}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
          <p className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-100">Select LLM Provider</p>
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => p.configured && select(p.id)}
              disabled={!p.configured}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${!p.configured ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={`text-sm font-medium ${p.id === active ? 'text-blue-600' : 'text-gray-800'}`}>{p.label}</span>
                  {p.id === active && <span className="text-xs text-blue-500">✓</span>}
                </div>
                {!p.configured && <span className="text-xs text-gray-400">not configured</span>}
              </div>
              <p className="text-xs text-gray-400 ml-3.5">{p.model}{p.free ? ` · ${p.free}` : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
