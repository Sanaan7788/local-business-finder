import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  useBusinessStats,
  useScraperStatus,
  useStartScraper,
  useStartBatch,
  useStopScraper,
  useLookupBusiness,
} from '../hooks/useBusinesses'

// ---------------------------------------------------------------------------
// Full category list — Google Maps search terms
// ---------------------------------------------------------------------------

export const ALL_CATEGORIES = [
  // Food & Drink
  'restaurants', 'fast food', 'pizza', 'chinese restaurants', 'mexican restaurants',
  'italian restaurants', 'thai restaurants', 'indian restaurants', 'sushi restaurants',
  'burger joints', 'sandwich shops', 'coffee shops', 'bakeries', 'dessert shops',
  'ice cream shops', 'bars', 'nightclubs', 'food trucks', 'catering',
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
  'dentists', 'chiropractors', 'physical therapy', 'optometrists', 'urgent care',
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
]

// ---------------------------------------------------------------------------
// Extract a usable location string from a Google Maps URL
// Supports: /maps/place/Name/@lat,lng  /maps/search/query  /maps/@lat,lng
// ---------------------------------------------------------------------------
function extractLocationFromMapsUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('google.com') && !u.hostname.includes('maps.app.goo.gl')) return null

    // /maps/place/Business+Name/@lat,lng,...
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    }

    // /maps/search/query+string
    const searchMatch = u.pathname.match(/\/maps\/search\/([^/@?]+)/)
    if (searchMatch) {
      return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
    }

    // /maps/@lat,lng or ?ll=lat,lng or ?q=lat,lng
    const coordMatch =
      u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      u.searchParams.get('ll')?.match(/(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      u.searchParams.get('q')?.match(/(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) {
      return `${coordMatch[1]},${coordMatch[2]}`
    }

    // ?q=query string (generic Maps search)
    const q = u.searchParams.get('q')
    if (q) return q

    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// Searchable category picker
function CategoryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? ALL_CATEGORIES.filter(c => c.includes(q)) : ALL_CATEGORIES
  }, [search])

  return (
    <div className="relative">
      <label className="block text-xs text-gray-500 mb-1">Category</label>
      <div
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer bg-white flex justify-between items-center focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setOpen(o => !o)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Select category'}
        </span>
        <span className="text-gray-400 ml-2">▾</span>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Search categories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">No results</p>
            )}
            {filtered.map(cat => (
              <button
                key={cat}
                className={`w-full text-left text-sm px-3 py-1.5 hover:bg-blue-50 capitalize ${cat === value ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
                onClick={() => { onChange(cat); setOpen(false); setSearch('') }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Multi-select category picker for batch mode
function BatchCategoryPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? ALL_CATEGORIES.filter(c => c.includes(q)) : ALL_CATEGORIES
  }, [search])

  const toggle = (cat: string) => {
    onChange(
      selected.includes(cat)
        ? selected.filter(c => c !== cat)
        : [...selected, cat],
    )
  }

  const selectAll = () => onChange([...ALL_CATEGORIES])
  const clearAll = () => onChange([])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-500">Categories ({selected.length} selected)</label>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">All</button>
          <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">Clear</button>
        </div>
      </div>
      <input
        type="text"
        placeholder="Search categories…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
        {filtered.map(cat => (
          <label key={cat} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(cat)}
              onChange={() => toggle(cat)}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700 capitalize">{cat}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: stats } = useBusinessStats()
  const { data: scraper } = useScraperStatus()
  const startScraper = useStartScraper()
  const startBatch = useStartBatch()
  const stopScraper = useStopScraper()
  const lookupBusiness = useLookupBusiness()

  const [lookupName, setLookupName] = useState('')
  const [lookupLocation, setLookupLocation] = useState('')
  const [lookupResult, setLookupResult] = useState<{ status: string; businessId?: string; message: string } | null>(null)

  const [mode, setMode] = useState<'single' | 'batch' | 'lookup'>('single')
  const [location, setLocation] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [mapsLinkError, setMapsLinkError] = useState('')
  const [category, setCategory] = useState('restaurants')
  const [batchCategories, setBatchCategories] = useState<string[]>([])
  const [maxResults, setMaxResults] = useState(20)
  const [error, setError] = useState('')

  const effectiveLocation = location.trim()

  const handleMapsLinkExtract = () => {
    const extracted = extractLocationFromMapsUrl(mapsLink.trim())
    if (extracted) {
      setLocation(extracted)
      setMapsLink('')
      setMapsLinkError('')
    } else {
      setMapsLinkError('Could not extract location from this URL. Paste a Google Maps place or search URL.')
    }
  }

  const handleStart = async () => {
    if (!effectiveLocation) { setError('Location is required'); return }
    setError('')
    try {
      if (mode === 'single') {
        await startScraper.mutateAsync({ zipcode: effectiveLocation, category, maxResults })
      } else {
        if (batchCategories.length === 0) { setError('Select at least one category'); return }
        await startBatch.mutateAsync({ zipcode: effectiveLocation, categories: batchCategories, maxResults })
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const running = scraper?.running ?? false
  const batch = scraper?.batch
  const isBatch = batch && batch.totalJobs > 1
  const progress = scraper && scraper.found > 0
    ? Math.round((scraper.saved + scraper.skipped + scraper.errors) / scraper.found * 100)
    : 0
  const batchProgress = isBatch
    ? Math.round((batch.completedJobs / batch.totalJobs) * 100)
    : 0

  const isPending = startScraper.isPending || startBatch.isPending

  const handleLookup = async () => {
    if (!lookupName.trim() || !lookupLocation.trim()) return
    setLookupResult(null)
    try {
      const result = await lookupBusiness.mutateAsync({ businessName: lookupName.trim(), location: lookupLocation.trim() })
      setLookupResult(result)
    } catch (e: any) {
      setLookupResult({ status: 'error', message: e.message })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your lead pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Businesses" value={stats?.total ?? 0} />
        <StatCard label="No Website" value={stats?.noWebsite ?? 0} sub="potential leads" />
        <StatCard label="Deployed" value={stats?.deployed ?? 0} sub="live sites" />
        <StatCard
          label="Hot Leads"
          value={stats?.byPriority?.high ?? 0}
          sub="high priority"
        />
      </div>

      {/* Pipeline breakdown */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Status</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <button
                key={status}
                onClick={() => navigate(`/businesses?leadStatus=${status}`)}
                className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{status}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scraper control */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Scraper</h2>

        {/* Running: batch progress */}
        {running && isBatch && batch && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-800">
                Batch: {batch.completedJobs}/{batch.totalJobs} jobs — {scraper?.zipcode}
              </span>
              <span className="text-sm text-blue-600">{batchProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mb-2">
              Currently: <span className="font-medium capitalize">{scraper?.category}</span>
            </p>
            {batch.pendingJobs.length > 0 && (
              <p className="text-xs text-blue-600">
                Next: {batch.pendingJobs.slice(0, 3).map(j => j.category).join(', ')}
                {batch.pendingJobs.length > 3 ? ` +${batch.pendingJobs.length - 3} more` : ''}
              </p>
            )}
          </div>
        )}

        {/* Running: single session progress */}
        {running && scraper && (
          <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-800">
                Scraping {scraper.zipcode} — {scraper.category}
              </span>
              <span className="text-sm text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2 mb-3">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-indigo-700">
              <span>Found: {scraper.found}</span>
              <span>Saved: {scraper.saved}</span>
              <span>Skipped: {scraper.skipped}</span>
              <span>Errors: {scraper.errors}</span>
            </div>
          </div>
        )}

        {/* Not running: scraper form */}
        {!running && (
          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  mode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Area Search
              </button>
              <button
                onClick={() => setMode('batch')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  mode === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Batch
              </button>
              <button
                onClick={() => { setMode('lookup'); setLookupResult(null) }}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  mode === 'lookup' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Lookup One Business
              </button>
            </div>

            {/* Lookup mode form */}
            {mode === 'lookup' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Enter the exact business name and its location. The scraper will find that specific business on Google Maps and save its full profile.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={lookupName}
                      onChange={e => setLookupName(e.target.value)}
                      placeholder="e.g. Tony's Pizza, Nails by Maria"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Location</label>
                    <input
                      type="text"
                      value={lookupLocation}
                      onChange={e => setLookupLocation(e.target.value)}
                      placeholder="e.g. 77477  or  Houston TX  or  Westheimer Rd Houston"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLookup}
                  disabled={lookupBusiness.isPending || !lookupName.trim() || !lookupLocation.trim()}
                  className="bg-purple-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {lookupBusiness.isPending ? 'Looking up…' : 'Look Up Business'}
                </button>
                {lookupBusiness.isPending && (
                  <p className="text-xs text-gray-400">This may take 20–40 seconds while the scraper opens Google Maps…</p>
                )}
                {lookupResult && (
                  <div className={`rounded-lg p-4 text-sm ${
                    lookupResult.status === 'saved'     ? 'bg-green-50 border border-green-200 text-green-800' :
                    lookupResult.status === 'duplicate' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                    lookupResult.status === 'not_found' ? 'bg-gray-50 border border-gray-200 text-gray-700' :
                                                          'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="font-medium mb-1">
                      {lookupResult.status === 'saved'     ? 'Saved' :
                       lookupResult.status === 'duplicate' ? 'Already in database' :
                       lookupResult.status === 'not_found' ? 'Not found' : 'Error'}
                    </p>
                    <p>{lookupResult.message}</p>
                    {lookupResult.businessId && (
                      <button
                        onClick={() => navigate(`/businesses/${lookupResult.businessId}`)}
                        className="mt-2 text-xs underline hover:no-underline"
                      >
                        View profile →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Area search / batch form */}
            {mode !== 'lookup' && <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Location — spans 2 cols */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Location
                  <span className="text-gray-400 font-normal ml-1">— zipcode, address, neighborhood, intersection, or landmark</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. 77477  or  Montrose Houston TX  or  Main St & 1st Ave Houston"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Maps link extractor */}
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="text"
                    value={mapsLink}
                    onChange={e => { setMapsLink(e.target.value); setMapsLinkError('') }}
                    placeholder="Or paste a Google Maps link here…"
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleMapsLinkExtract}
                    disabled={!mapsLink.trim()}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Extract Location
                  </button>
                </div>
                {mapsLinkError && <p className="text-xs text-red-500 mt-1">{mapsLinkError}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Supports: zipcode · street address · neighborhood · intersection · landmark · coordinates · Google Maps URL
                </p>
              </div>

              {/* Single category picker */}
              {mode === 'single' && (
                <CategoryPicker value={category} onChange={setCategory} />
              )}

              {/* Max results */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Max Results: {maxResults}
                </label>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={maxResults}
                  onChange={e => setMaxResults(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>

              {/* Start button */}
              <div className="flex items-end">
                <button
                  onClick={handleStart}
                  disabled={isPending}
                  className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isPending
                    ? 'Starting…'
                    : mode === 'batch'
                      ? `Start Batch (${batchCategories.length})`
                      : 'Start Scraper'}
                </button>
              </div>
            </div>}

            {/* Batch category picker */}
            {mode === 'batch' && (
              <BatchCategoryPicker
                selected={batchCategories}
                onChange={setBatchCategories}
              />
            )}

            {mode === 'batch' && (
              <p className="text-xs text-gray-500">
                Each category runs as a separate session (~20 results each). {batchCategories.length} categories = ~{batchCategories.length * maxResults} businesses max.
              </p>
            )}
          </div>
        )}

        {running && (
          <button
            onClick={() => stopScraper.mutate()}
            className="mt-3 bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Stop Scraper
          </button>
        )}

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        {/* Last session results */}
        {!running && scraper?.finishedAt && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-600">Last session results</p>
              <Link to="/history" className="text-xs text-blue-600 hover:underline">View all history →</Link>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Found', value: scraper.found, color: 'text-gray-900' },
                { label: 'Saved', value: scraper.saved, color: 'text-green-600' },
                { label: 'Skipped', value: scraper.skipped, color: 'text-yellow-600' },
                { label: 'Errors', value: scraper.errors, color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="text-center bg-gray-50 rounded-lg p-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            {scraper.savedList.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-green-700 font-medium hover:underline">
                  Saved businesses ({scraper.savedList.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {scraper.savedList.map(b => (
                    <Link key={b.id} to={`/businesses/${b.id}`} className="flex justify-between items-center py-1 px-2 bg-green-50 rounded hover:bg-green-100 transition-colors">
                      <span className="text-gray-800">{b.name}</span>
                      <span className={`text-xs ${b.priority === 'high' ? 'text-red-600' : b.priority === 'medium' ? 'text-orange-600' : 'text-gray-400'}`}>
                        {b.priority} ({b.priorityScore})
                      </span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
            {scraper.skippedList.length > 0 && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer text-yellow-700 font-medium hover:underline">
                  Skipped duplicates ({scraper.skippedList.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {scraper.skippedList.map((s, i) => (
                    <div key={i} className="flex justify-between items-center py-1 px-2 bg-yellow-50 rounded">
                      <span className="text-gray-800">{s.name}</span>
                      <span className="text-yellow-600">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
            {scraper.errorList.length > 0 && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer text-red-600 font-medium hover:underline">
                  Errors ({scraper.errorList.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {scraper.errorList.map((e, i) => (
                    <div key={i} className="py-1 px-2 bg-red-50 rounded">
                      <span className="text-gray-800">{e.name}: </span>
                      <span className="text-red-600">{e.message}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
