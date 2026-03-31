import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scraperApi, businessApi } from '../lib/api'
import type { SavedEntry, SkippedEntry, ErrorEntry } from '../types/business'

function useHistory() {
  return useQuery({ queryKey: ['scraper', 'history'], queryFn: scraperApi.history })
}

function useSessionDetail(id: string | null) {
  return useQuery({
    queryKey: ['scraper', 'history', id],
    queryFn: () => scraperApi.historyById(id!),
    enabled: Boolean(id),
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-xs text-blue-600 hover:underline ml-1 shrink-0"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Create-stub button — shown for found names that aren't saved yet
// ---------------------------------------------------------------------------
function CreateProfileBtn({
  name,
  zipcode,
  category,
  onCreated,
}: {
  name: string
  zipcode: string
  category: string
  onCreated: (id: string) => void
}) {
  const qc = useQueryClient()
  const create = useMutation({
    mutationFn: () => businessApi.create({ name, zipcode, category }),
    onSuccess: (business) => {
      qc.invalidateQueries({ queryKey: ['businesses'] })
      onCreated(business.id)
    },
  })

  if (create.isSuccess) return (
    <span className="text-xs text-green-600 font-medium">Created ✓</span>
  )

  return (
    <button
      onClick={() => create.mutate()}
      disabled={create.isPending}
      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {create.isPending ? '…' : '+ Create Profile'}
    </button>
  )
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
    { key: 'saved',   label: `Saved (${data.saved})`,   color: data.saved   > 0 ? 'text-green-600' : '' },
    { key: 'skipped', label: `Skipped (${data.skipped})`, color: data.skipped > 0 ? 'text-yellow-600' : '' },
    { key: 'errors',  label: `Errors (${data.errors})`,  color: data.errors  > 0 ? 'text-red-500' : '' },
    { key: 'found',   label: `Found (${data.found})`,    color: '' },
  ] as const

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900">{data.zipcode} — {data.category}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(data.startedAt).toLocaleString()} → {data.finishedAt ? new Date(data.finishedAt).toLocaleString() : 'running'}
          </p>
          {data.tokensUsed > 0 && (
            <p className="text-xs text-purple-600 mt-0.5">{data.tokensUsed.toLocaleString()} tokens used</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="flex border-b border-gray-200 px-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : `border-transparent ${t.color || 'text-gray-500'} hover:text-gray-700`
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-[520px] overflow-y-auto">

        {/* ---- SAVED ---- */}
        {tab === 'saved' && (
          data.savedList.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">Nothing saved this session</p>
            : <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-3">Full profiles — click name to open, copy phone for outreach.</p>
                {data.savedList.map((b: SavedEntry) => (
                  <div key={b.id} className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/businesses/${b.id}`)}
                          className="text-sm font-semibold text-blue-700 hover:underline text-left"
                        >
                          {b.name}
                        </button>
                        <p className="text-xs text-gray-500 mt-0.5">{b.address}</p>
                        {b.phone
                          ? <p className="text-xs text-gray-700 mt-1 font-mono">📞 {b.phone}<CopyBtn text={b.phone} /></p>
                          : <p className="text-xs text-gray-400 mt-1">No phone</p>
                        }
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          b.priority === 'high' ? 'bg-red-100 text-red-700' :
                          b.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {b.priority} ({b.priorityScore})
                        </span>
                        {!b.website && <p className="text-xs text-red-500 mt-1 font-medium">No website</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* ---- SKIPPED ---- */}
        {tab === 'skipped' && (
          data.skippedList.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No duplicates skipped</p>
            : <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-3">Already in your database — click to open existing record.</p>
                {data.skippedList.map((s: SkippedEntry, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.address}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{s.reason}</span>
                        <button
                          onClick={() => navigate(`/businesses/${s.existingId}`)}
                          className="block text-xs text-blue-600 hover:underline mt-1 ml-auto"
                        >
                          view existing →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* ---- ERRORS ---- */}
        {tab === 'errors' && (
          data.errorList.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No errors</p>
            : <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-3">
                  Found on Maps but couldn't scrape. Create a stub profile to track manually, or search Maps to fill in details.
                </p>
                {data.errorList.map((e: ErrorEntry, i: number) => (
                  <div key={i} className="border border-red-100 rounded-lg p-3 bg-red-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{e.name}</p>
                        <p className="text-xs text-red-600 mt-0.5">{e.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <a
                          href={`https://www.google.com/maps/search/${encodeURIComponent(e.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Search Maps →
                        </a>
                        <CreateProfileBtn
                          name={e.name}
                          zipcode={data.zipcode}
                          category={data.category}
                          onCreated={(id) => navigate(`/businesses/${id}`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* ---- FOUND (all names) ---- */}
        {tab === 'found' && (
          data.foundNames.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No card names recorded</p>
            : <FoundNamesTab
                names={data.foundNames}
                savedList={data.savedList}
                zipcode={data.zipcode}
                category={data.category}
              />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Found names tab — shows all names, with status badge and create option
// ---------------------------------------------------------------------------
function FoundNamesTab({
  names,
  savedList,
  zipcode,
  category,
}: {
  names: string[]
  savedList: SavedEntry[]
  zipcode: string
  category: string
}) {
  const navigate = useNavigate()
  const savedNames = new Set(savedList.map(b => b.name.toLowerCase()))
  const [createdIds, setCreatedIds] = useState<Record<string, string>>({})

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        All {names.length} businesses found on Maps. Green = saved to DB. Others can be created as stub profiles.
      </p>
      <div className="space-y-1.5">
        {names.map((name, i) => {
          const isSaved = savedNames.has(name.toLowerCase())
          const savedEntry = savedList.find(b => b.name.toLowerCase() === name.toLowerCase())
          const createdId = createdIds[name]

          return (
            <div
              key={i}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
                isSaved ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-800">{name}</span>
                {isSaved && savedEntry?.phone && (
                  <span className="text-xs text-gray-500 ml-2 font-mono">{savedEntry.phone}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isSaved && savedEntry ? (
                  <button
                    onClick={() => navigate(`/businesses/${savedEntry.id}`)}
                    className="text-xs text-green-700 hover:underline font-medium"
                  >
                    View profile →
                  </button>
                ) : createdId ? (
                  <button
                    onClick={() => navigate(`/businesses/${createdId}`)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit profile →
                  </button>
                ) : (
                  <>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-blue-600"
                      title="Search on Maps"
                    >
                      ↗
                    </a>
                    <CreateProfileBtn
                      name={name}
                      zipcode={zipcode}
                      category={category}
                      onCreated={(id) => setCreatedIds(prev => ({ ...prev, [name]: id }))}
                    />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main history page
// ---------------------------------------------------------------------------
export default function ScraperHistory() {
  const { data: sessions, isLoading } = useHistory()
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scrape History</h1>
        <p className="text-gray-500 text-sm mt-0.5">All past scraping sessions and locations covered</p>
      </div>

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
                    {s.tokensUsed > 0 && (
                      <div><p className="font-bold text-purple-600">{s.tokensUsed.toLocaleString()}</p><p className="text-xs text-gray-400">tokens</p></div>
                    )}
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
    </div>
  )
}
