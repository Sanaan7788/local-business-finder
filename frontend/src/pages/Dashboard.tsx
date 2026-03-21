import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useBusinessStats, useScraperStatus, useStartScraper, useStopScraper } from '../hooks/useBusinesses'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: stats } = useBusinessStats()
  const { data: scraper } = useScraperStatus()
  const startScraper = useStartScraper()
  const stopScraper = useStopScraper()

  const [zipcode, setZipcode] = useState('')
  const [category, setCategory] = useState('restaurants')
  const [maxResults, setMaxResults] = useState(20)
  const [error, setError] = useState('')

  const handleStart = async () => {
    if (!zipcode.trim()) { setError('Zipcode is required'); return }
    setError('')
    try {
      await startScraper.mutateAsync({ zipcode: zipcode.trim(), category, maxResults })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const running = scraper?.running ?? false
  const progress = scraper && scraper.found > 0
    ? Math.round((scraper.saved + scraper.skipped + scraper.errors) / scraper.found * 100)
    : 0

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

        {running && scraper && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                Scraping {scraper.zipcode} — {scraper.category}
              </span>
              <span className="text-sm text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-blue-700">
              <span>Found: {scraper.found}</span>
              <span>Saved: {scraper.saved}</span>
              <span>Skipped: {scraper.skipped}</span>
              <span>Errors: {scraper.errors}</span>
            </div>
          </div>
        )}

        {!running && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Zipcode</label>
              <input
                type="text"
                value={zipcode}
                onChange={e => setZipcode(e.target.value)}
                placeholder="e.g. 77477"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="restaurants">Restaurants</option>
                <option value="plumbers">Plumbers</option>
                <option value="electricians">Electricians</option>
                <option value="nail salons">Nail Salons</option>
                <option value="hair salons">Hair Salons</option>
                <option value="auto repair">Auto Repair</option>
                <option value="dentists">Dentists</option>
                <option value="businesses">All Businesses</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Results: {maxResults}</label>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={maxResults}
                onChange={e => setMaxResults(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleStart}
                disabled={startScraper.isPending}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {startScraper.isPending ? 'Starting…' : 'Start Scraper'}
              </button>
            </div>
          </div>
        )}

        {running && (
          <button
            onClick={() => stopScraper.mutate()}
            className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Stop Scraper
          </button>
        )}

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

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
