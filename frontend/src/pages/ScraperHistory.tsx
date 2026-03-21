import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { scraperApi } from '../lib/api'
import type { SavedEntry, SkippedEntry, ErrorEntry } from '../types/business'

function useHistory() {
  return useQuery({ queryKey: ['scraper', 'history'], queryFn: scraperApi.history })
}

function useZipcodes() {
  return useQuery({ queryKey: ['scraper', 'zipcodes'], queryFn: scraperApi.zipcodes })
}

function useSessionDetail(id: string | null) {
  return useQuery({
    queryKey: ['scraper', 'history', id],
    queryFn: () => scraperApi.historyById(id!),
    enabled: Boolean(id),
  })
}

// ---------------------------------------------------------------------------
// Session detail panel
// ---------------------------------------------------------------------------
function SessionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useSessionDetail(id)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'saved' | 'skipped' | 'errors' | 'found'>('saved')

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading session…</div>
  if (!data) return null

  const tabs = [
    { key: 'saved', label: `Saved (${data.saved})` },
    { key: 'skipped', label: `Skipped (${data.skipped})` },
    { key: 'errors', label: `Errors (${data.errors})` },
    { key: 'found', label: `Found (${data.found})` },
  ] as const

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900">
            {data.zipcode} — {data.category}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(data.startedAt).toLocaleString()} →{' '}
            {data.finishedAt ? new Date(data.finishedAt).toLocaleString() : 'running'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {tab === 'saved' && (
          data.savedList.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">Nothing saved this session</p>
            : <div className="space-y-2">
                {data.savedList.map((b: SavedEntry) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => navigate(`/businesses/${b.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.address}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.priority === 'high' ? 'bg-red-100 text-red-700' :
                        b.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.priority} ({b.priorityScore})
                      </span>
                      {!b.website && <p className="text-xs text-red-500 mt-0.5">no website</p>}
                    </div>
                  </div>
                ))}
              </div>
        )}

        {tab === 'skipped' && (
          data.skippedList.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No duplicates skipped</p>
            : <div className="space-y-2">
                {data.skippedList.map((s: SkippedEntry, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.address}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {s.reason}
                      </span>
                      <button
                        onClick={() => navigate(`/businesses/${s.existingId}`)}
                        className="block text-xs text-blue-600 hover:underline mt-0.5 ml-auto"
                      >
                        view existing →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {tab === 'errors' && (
          data.errorList.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No errors</p>
            : <div className="space-y-2">
                {data.errorList.map((e: ErrorEntry, i: number) => (
                  <div key={i} className="p-2.5 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{e.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">{e.message}</p>
                  </div>
                ))}
              </div>
        )}

        {tab === 'found' && (
          data.foundNames.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No card names recorded</p>
            : <div className="grid grid-cols-2 gap-1.5">
                {data.foundNames.map((name: string, i: number) => (
                  <p key={i} className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">{name}</p>
                ))}
              </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main history page
// ---------------------------------------------------------------------------
export default function ScraperHistory() {
  const { data: sessions, isLoading } = useHistory()
  const { data: zipcodes } = useZipcodes()
  const navigate = useNavigate()
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [view, setView] = useState<'sessions' | 'zipcodes'>('zipcodes')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scrape History</h1>
          <p className="text-gray-500 text-sm mt-0.5">All past scraping sessions and zipcodes covered</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('zipcodes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'zipcodes' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Zipcodes
        </button>
        <button
          onClick={() => setView('sessions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'sessions' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Sessions
        </button>
      </div>

      {/* Zipcodes view */}
      {view === 'zipcodes' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {!zipcodes || zipcodes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No zipcodes scraped yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Zipcode</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sessions</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Total Saved</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Scraped</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">View Businesses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zipcodes.map(z => (
                  <tr key={z.zipcode} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{z.zipcode}</td>
                    <td className="px-4 py-3 text-gray-600">{z.sessions}</td>
                    <td className="px-4 py-3 text-gray-600">{z.totalSaved}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(z.lastScrapedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/businesses?zipcode=${z.zipcode}`)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Browse {z.zipcode} →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sessions view */}
      {view === 'sessions' && (
        <div className="space-y-4">
          {isLoading && <div className="p-8 text-center text-gray-500">Loading…</div>}
          {sessions && sessions.length === 0 && (
            <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
              No sessions yet. Run the scraper to get started.
            </div>
          )}
          {sessions && sessions.map((s: any) => (
            <div key={s.id}>
              <div
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => setSelectedSession(selectedSession === s.id ? null : s.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{s.zipcode} — {s.category}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(s.startedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-4 text-sm text-right">
                    <div><p className="font-bold text-gray-900">{s.found}</p><p className="text-xs text-gray-400">found</p></div>
                    <div><p className="font-bold text-green-600">{s.saved}</p><p className="text-xs text-gray-400">saved</p></div>
                    <div><p className="font-bold text-yellow-600">{s.skipped}</p><p className="text-xs text-gray-400">skipped</p></div>
                    <div><p className="font-bold text-red-500">{s.errors}</p><p className="text-xs text-gray-400">errors</p></div>
                  </div>
                </div>
              </div>
              {selectedSession === s.id && (
                <div className="mt-2">
                  <SessionDetail id={s.id} onClose={() => setSelectedSession(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
