import { ApiError } from '../api-error'
import type { Business } from '../../../types/business'
import type { ScrapeHistoryEntry } from '../../../types/scraper'
import type { SnapshotIndex } from '../../../types/snapshot'

// ---------------------------------------------------------------------------
// Snapshot loader for the static (GitHub Pages) build. The files are written
// by backend/src/scripts/export-static.ts into frontend/public/data and are
// served next to the app under the Vite base path.
// ---------------------------------------------------------------------------

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

async function fetchJson<T>(rel: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}data/${rel}`)
  } catch {
    throw new ApiError('Cannot load the snapshot data')
  }
  if (!res.ok) throw new ApiError(res.status === 404 ? 'Not found' : `Failed to load ${rel} (${res.status})`, res.status)
  return (await res.json()) as T
}

/** Memoize one promise per key; a rejected promise is evicted so a retry can succeed. */
function memo<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit) return hit
  const pending = load().catch((err: unknown) => {
    cache.delete(key)
    throw err
  })
  cache.set(key, pending)
  return pending
}

const indexCache = new Map<string, Promise<SnapshotIndex>>()
const businessCache = new Map<string, Promise<Business>>()
const sessionsCache = new Map<string, Promise<ScrapeHistoryEntry[]>>()

export const snapshot = {
  index: () => memo(indexCache, 'index', () => fetchJson<SnapshotIndex>('index.json')),
  business: (id: string) => memo(businessCache, id, () => fetchJson<Business>(`businesses/${encodeURIComponent(id)}.json`)),
  sessions: () => memo(sessionsCache, 'sessions', () => fetchJson<ScrapeHistoryEntry[]>('sessions.json')),
}
