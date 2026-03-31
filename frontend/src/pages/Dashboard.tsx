import { useState, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useBusinessStats } from '../hooks/useBusinesses'
import {
  useScraperStatus,
  useStartScraper,
  useStartBatch,
  useStopScraper,
  useLookupBusiness,
  useImportFromUrl,
} from '../hooks/useScraper'

// ---------------------------------------------------------------------------
// Full category list — Google Maps search terms
// ---------------------------------------------------------------------------

export const ALL_CATEGORIES = [
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
  'phone repair',
]

// ---------------------------------------------------------------------------
// Extract location from Google Maps URL
// ---------------------------------------------------------------------------
function extractLocationFromMapsUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('google.com') && !u.hostname.includes('maps.app.goo.gl')) return null
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    const searchMatch = u.pathname.match(/\/maps\/search\/([^/@?]+)/)
    if (searchMatch) return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
    const coordMatch =
      u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      u.searchParams.get('ll')?.match(/(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      u.searchParams.get('q')?.match(/(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) return `${coordMatch[1]},${coordMatch[2]}`
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

// Tag-based category input
function CategoryTagInput({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = inputValue.toLowerCase()
    return q
      ? ALL_CATEGORIES.filter(c => c.includes(q) && !selected.includes(c))
      : ALL_CATEGORIES.filter(c => !selected.includes(c))
  }, [inputValue, selected])

  const add = (cat: string) => {
    if (!selected.includes(cat)) onChange([...selected, cat])
    setInputValue('')
    setShowDropdown(false)
  }

  const remove = (cat: string) => onChange(selected.filter(c => c !== cat))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      add(filtered[0])
    } else if (e.key === 'Backspace' && !inputValue && selected.length > 0) {
      remove(selected[selected.length - 1])
    }
  }

  return (
    <div className="relative">
      <div
        className="min-h-[42px] w-full border border-gray-300 rounded-lg px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => { inputRef.current?.focus(); setShowDropdown(true) }}
      >
        {selected.map(cat => (
          <span key={cat} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-md capitalize">
            {cat}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); remove(cat) }}
              className="hover:text-blue-600 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? 'e.g. nail salons, restaurants, plumbers…' : ''}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0
            ? <p className="text-xs text-gray-400 px-3 py-2">No match — press Enter to use custom category</p>
            : filtered.map(cat => (
              <button
                key={cat}
                onMouseDown={() => add(cat)}
                className="w-full text-left text-sm px-3 py-1.5 hover:bg-blue-50 capitalize text-gray-700"
              >
                {cat}
              </button>
            ))
          }
        </div>
      )}
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
  const importFromUrl = useImportFromUrl()

  // Shared
  const [location, setLocation] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [mapsLinkError, setMapsLinkError] = useState('')
  const [error, setError] = useState('')
  const [locationType, setLocationType] = useState<'zipcode' | 'address' | 'mapslink' | 'live'>('zipcode')
  const [liveStatus, setLiveStatus] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle')
  const [liveError, setLiveError] = useState('')

  // Search type toggle: 'category' = area/batch, 'business' = lookup, 'url' = import from website
  const [searchType, setSearchType] = useState<'category' | 'business' | 'url'>('category')

  // Import from URL mode
  const [importUrl, setImportUrl] = useState('')
  const [importResult, setImportResult] = useState<{ status: string; businessId?: string; message: string } | null>(null)

  // Category mode
  const [categories, setCategories] = useState<string[]>([])
  const [maxResults, setMaxResults] = useState(20)

  // Lookup mode
  const [lookupName, setLookupName] = useState('')
  const [lookupResult, setLookupResult] = useState<{ status: string; businessId?: string; message: string } | null>(null)

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setLiveError('Geolocation is not supported by your browser.')
      setLiveStatus('error')
      return
    }
    setLiveStatus('fetching')
    setLiveError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation(`${latitude.toFixed(6)},${longitude.toFixed(6)}`)
        setLiveStatus('done')
      },
      (err) => {
        setLiveError(err.message || 'Could not get your location.')
        setLiveStatus('error')
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const handleMapsLinkExtract = () => {
    const extracted = extractLocationFromMapsUrl(mapsLink.trim())
    if (extracted) {
      setLocation(extracted)
      setMapsLink('')
      setMapsLinkError('')
    } else {
      setMapsLinkError('Could not extract location from this URL.')
    }
  }

  const handleStart = async () => {
    const loc = location.trim()
    if (!loc) { setError('Location is required'); return }
    setError('')
    try {
      if (categories.length <= 1) {
        await startScraper.mutateAsync({ zipcode: loc, category: categories[0] ?? 'businesses', maxResults })
      } else {
        await startBatch.mutateAsync({ zipcode: loc, categories, maxResults })
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleImport = async () => {
    const url = importUrl.trim()
    if (!url) { setError('Website URL is required'); return }
    setError('')
    setImportResult(null)
    try {
      const result = await importFromUrl.mutateAsync(url)
      setImportResult(result)
    } catch (e: any) {
      setImportResult({ status: 'error', message: e.message })
    }
  }

  const handleLookup = async () => {
    const loc = location.trim()
    const name = lookupName.trim()
    if (!loc || !name) { setError('Both business name and location are required'); return }
    setError('')
    setLookupResult(null)
    try {
      const result = await lookupBusiness.mutateAsync({ businessName: name, location: loc })
      setLookupResult(result)
    } catch (e: any) {
      setLookupResult({ status: 'error', message: e.message })
    }
  }

  const running = scraper?.running ?? false
  const batch = scraper?.batch
  const isBatch = batch && batch.totalJobs > 1
  const progress = scraper && scraper.found > 0
    ? Math.round((scraper.saved + scraper.skipped + scraper.errors) / scraper.found * 100)
    : 0
  const batchProgress = isBatch ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0
  const isPending = startScraper.isPending || startBatch.isPending || lookupBusiness.isPending || importFromUrl.isPending
  const isBatchMode = categories.length > 1

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your lead pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Businesses" value={stats?.total ?? 0} />
        <StatCard label="No Website" value={stats?.noWebsite ?? 0} sub="potential leads" />
        <StatCard label="Deployed" value={stats?.deployed ?? 0} sub="live sites" />
        <StatCard label="Hot Leads" value={stats?.byPriority?.high ?? 0} sub="high priority" />
      </div>

      {/* Pipeline breakdown */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Status</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <button
                key={status}
                onClick={() => navigate(`/businesses?leadStatus=${status}`)}
                className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{status}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scraper control */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
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
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${batchProgress}%` }} />
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
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-4 text-xs text-indigo-700">
              <span>Found: {scraper.found}</span>
              <span>Saved: {scraper.saved}</span>
              <span>Skipped: {scraper.skipped}</span>
              <span>Errors: {scraper.errors}</span>
            </div>
          </div>
        )}

        {/* Form */}
        {!running && (
          <div className="space-y-4">

            {/* Row 1: Location — only shown for category/business search, not URL import */}
            <div className={searchType === 'url' ? 'hidden' : ''}>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={locationType}
                  onChange={e => {
                    setLocationType(e.target.value as 'zipcode' | 'address' | 'mapslink' | 'live')
                    setLocation('')
                    setMapsLink('')
                    setMapsLinkError('')
                    setLiveStatus('idle')
                    setLiveError('')
                  }}
                  className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="zipcode">Zipcode</option>
                  <option value="address">Address</option>
                  <option value="mapslink">Google Maps Link</option>
                  <option value="live">📍 Live Location</option>
                </select>

                {locationType === 'zipcode' && (
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. 77477"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {locationType === 'address' && (
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Montrose Houston TX"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {locationType === 'live' && (
                  <button
                    onClick={handleGetLiveLocation}
                    disabled={liveStatus === 'fetching'}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors text-left text-gray-600"
                  >
                    {liveStatus === 'fetching'
                      ? '⏳ Getting location…'
                      : liveStatus === 'done' && location
                      ? `📍 ${location} — tap to refresh`
                      : '📍 Tap to get current location'}
                  </button>
                )}
                {locationType === 'mapslink' && (
                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="text"
                      value={mapsLink}
                      onChange={e => { setMapsLink(e.target.value); setMapsLinkError('') }}
                      placeholder="Paste a Google Maps link…"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleMapsLinkExtract}
                      disabled={!mapsLink.trim()}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      Extract
                    </button>
                  </div>
                )}
              </div>
              {mapsLinkError && <p className="text-xs text-red-500 mt-1">{mapsLinkError}</p>}
              {locationType === 'mapslink' && location && (
                <p className="text-xs text-green-600 mt-1">✓ Extracted: {location}</p>
              )}
              {locationType === 'live' && liveStatus === 'error' && (
                <p className="text-xs text-red-500 mt-1">{liveError}</p>
              )}
              {locationType === 'live' && liveStatus === 'done' && location && (
                <p className="text-xs text-green-600 mt-1">✓ Location: {location}</p>
              )}
            </div>

            {/* Row 2: What to find — toggle */}
            <div>
              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  onClick={() => { setSearchType('category'); setLookupResult(null); setImportResult(null) }}
                  className={`flex-1 sm:flex-none px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    searchType === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Search by Category
                </button>
                <button
                  onClick={() => { setSearchType('business'); setLookupResult(null); setImportResult(null) }}
                  className={`flex-1 sm:flex-none px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    searchType === 'business' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Find Specific Business
                </button>
                <button
                  onClick={() => { setSearchType('url'); setLookupResult(null); setImportResult(null) }}
                  className={`flex-1 sm:flex-none px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    searchType === 'url' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Import from Website
                </button>
              </div>

              {/* Category mode */}
              {searchType === 'category' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {isBatchMode
                        ? `Categories (${categories.length}) — will run as batch`
                        : 'Category (optional — leave empty for all nearby businesses)'}
                    </label>
                    <CategoryTagInput selected={categories} onChange={setCategories} />
                    {isBatchMode && (
                      <p className="text-xs text-gray-400 mt-1">~{categories.length * maxResults} businesses max</p>
                    )}
                    {categories.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">No category — will search "businesses near [location]"</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500">Max results per category: {maxResults}</label>
                    <input
                      type="range"
                      min={5} max={200} step={5}
                      value={maxResults}
                      onChange={e => setMaxResults(Number(e.target.value))}
                      className="w-full"
                    />
                    <button
                      onClick={handleStart}
                      disabled={isPending}
                      className="w-full bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Starting…' : isBatchMode ? `Start Batch (${categories.length})` : categories.length === 0 ? 'Start Scraper (All Nearby)' : 'Start Scraper'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lookup mode */}
              {searchType === 'business' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500">Business Name</label>
                    <input
                      type="text"
                      value={lookupName}
                      onChange={e => setLookupName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLookup()}
                      placeholder="e.g. Tony's Pizza, Nails by Maria, Joe's Barbershop"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleLookup}
                      disabled={isPending || !lookupName.trim() || !location.trim()}
                      className="w-full bg-purple-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {lookupBusiness.isPending ? 'Looking up…' : 'Look Up'}
                    </button>
                  </div>
                  {lookupBusiness.isPending && (
                    <p className="text-xs text-gray-400">Opening Google Maps — this takes 20–40 seconds…</p>
                  )}
                  {lookupResult && (
                    <div className={`rounded-lg p-3 text-sm ${
                      lookupResult.status === 'saved'     ? 'bg-green-50 border border-green-200 text-green-800' :
                      lookupResult.status === 'duplicate' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                      lookupResult.status === 'not_found' ? 'bg-gray-50 border border-gray-200 text-gray-600' :
                                                            'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      <span className="font-medium">
                        {lookupResult.status === 'saved'     ? 'Saved — ' :
                         lookupResult.status === 'duplicate' ? 'Already in database — ' :
                         lookupResult.status === 'not_found' ? 'Not found — ' : 'Error — '}
                      </span>
                      {lookupResult.message}
                      {lookupResult.businessId && (
                        <button
                          onClick={() => navigate(`/businesses/${lookupResult.businessId}`)}
                          className="ml-2 underline hover:no-underline text-xs"
                        >
                          View profile →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Import from URL mode */}
              {searchType === 'url' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Paste the business's existing website URL. We'll extract its name, phone, address and run full AI analysis automatically.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500">Website URL</label>
                    <input
                      type="url"
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleImport()}
                      placeholder="https://www.example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={handleImport}
                      disabled={isPending || !importUrl.trim()}
                      className="w-full bg-green-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {importFromUrl.isPending ? 'Importing & analysing…' : 'Import Business'}
                    </button>
                  </div>
                  {importFromUrl.isPending && (
                    <p className="text-xs text-gray-400">Fetching website and running AI analysis — this may take 30–60 seconds…</p>
                  )}
                  {importResult && (
                    <div className={`rounded-lg p-3 text-sm ${
                      importResult.status === 'saved'     ? 'bg-green-50 border border-green-200 text-green-800' :
                      importResult.status === 'duplicate' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                                                            'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      <span className="font-medium">
                        {importResult.status === 'saved'     ? 'Saved — ' :
                         importResult.status === 'duplicate' ? 'Already in database — ' : 'Error — '}
                      </span>
                      {importResult.message}
                      {importResult.businessId && (
                        <button
                          onClick={() => navigate(`/businesses/${importResult.businessId}`)}
                          className="ml-2 underline hover:no-underline text-xs"
                        >
                          View profile →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        )}

        {running && (
          <button
            onClick={() => stopScraper.mutate()}
            className="mt-3 w-full sm:w-auto bg-red-100 text-red-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Stop Scraper
          </button>
        )}

        {/* Last session results */}
        {!running && scraper?.finishedAt && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-600">Last session results</p>
              <Link to="/history" className="text-xs text-blue-600 hover:underline">View all history →</Link>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Found',   value: scraper.found,   color: 'text-gray-900' },
                { label: 'Saved',   value: scraper.saved,   color: 'text-green-600' },
                { label: 'Skipped', value: scraper.skipped, color: 'text-yellow-600' },
                { label: 'Errors',  value: scraper.errors,  color: 'text-red-500' },
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
