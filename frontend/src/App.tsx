import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import BusinessDetail from './pages/BusinessDetail'
import ScraperHistory from './pages/ScraperHistory'
import { settingsApi, type ProviderInfo } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

const LS_KEY = 'llm_provider'

function LLMSelector() {
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

function TotalTokensCounter() {
  const { data } = useQuery({
    queryKey: ['settings', 'stats'],
    queryFn: settingsApi.getStats,
    refetchInterval: 60_000, // refresh every minute
  })

  const total = data?.totalTokensUsed ?? 0
  if (total === 0) return null

  const fmt = total >= 1_000_000
    ? `${(total / 1_000_000).toFixed(1)}M`
    : total >= 1_000
    ? `${(total / 1_000).toFixed(1)}k`
    : String(total)

  return (
    <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5" title={`${total.toLocaleString()} total tokens used`}>
      <span>⬡</span>
      <span className="font-medium">{fmt} tokens</span>
    </div>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }`

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="text-base font-bold text-blue-700 tracking-tight">
              Local Business Finder
            </span>
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/businesses" className={navLinkClass}>Businesses</NavLink>
                <NavLink to="/history" className={navLinkClass}>History</NavLink>
              </nav>
              <TotalTokensCounter />
              <LLMSelector />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500">Page not found.</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/businesses/:id" element={<BusinessDetail />} />
            <Route path="/history" element={<ScraperHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
