import type { BusinessListItem, LeadStatus } from '../../../types/business'
import type { ChangeMap, ChangesFile, LocalChange } from '../../../types/snapshot'
import { LEAD_STATUSES } from '../../leads'

// ---------------------------------------------------------------------------
// Browser-local edits for the static build. GitHub Pages has no backend, so
// status/notes changes live in localStorage, are merged over the snapshot on
// every read, and can be exported to a file for `npm run import:changes`.
// ---------------------------------------------------------------------------

export const CHANGES_STORAGE_KEY = 'lbf:changes'

let cache: ChangeMap | null = null
const listeners = new Set<() => void>()
let watchingStorage = false

const isStatus = (v: unknown): v is LeadStatus => typeof v === 'string' && (LEAD_STATUSES as string[]).includes(v)

function sanitizeChange(raw: unknown): LocalChange | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  if (typeof c.updatedAt !== 'string') return null
  const out: LocalChange = { updatedAt: c.updatedAt }
  if (isStatus(c.leadStatus)) out.leadStatus = c.leadStatus
  if (isStatus(c.fromLeadStatus)) out.fromLeadStatus = c.fromLeadStatus
  if (typeof c.notes === 'string' || c.notes === null) out.notes = c.notes
  if (typeof c.lastContactedAt === 'string' || c.lastContactedAt === null) out.lastContactedAt = c.lastContactedAt
  return out.leadStatus !== undefined || out.notes !== undefined || out.lastContactedAt !== undefined ? out : null
}

/** Drop anything that is not a well-formed change — storage and import files are untrusted. */
export function sanitizeChanges(raw: unknown): ChangeMap {
  if (!raw || typeof raw !== 'object') return {}
  const out: ChangeMap = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const change = sanitizeChange(value)
    if (change) out[id] = change
  }
  return out
}

function load(): ChangeMap {
  try {
    const raw = localStorage.getItem(CHANGES_STORAGE_KEY)
    return raw ? sanitizeChanges(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

function notify() {
  listeners.forEach(fn => fn())
}

function write(next: ChangeMap) {
  cache = next
  try {
    if (Object.keys(next).length > 0) localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(CHANGES_STORAGE_KEY)
  } catch {
    // storage unavailable — the in-memory copy still works for this session
  }
  notify()
}

/** Current overlay. Returns the same object until something changes (safe for useSyncExternalStore). */
export function readChanges(): ChangeMap {
  if (cache === null) cache = load()
  return cache
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!watchingStorage) {
    watchingStorage = true
    window.addEventListener('storage', e => {
      if (e.key === null || e.key === CHANGES_STORAGE_KEY) {
        cache = null
        notify()
      }
    })
  }
  return () => {
    listeners.delete(listener)
  }
}

/** Merge `patch` into the business's change; `base` records the snapshot status the first time. */
export function setChange(id: string, patch: Omit<LocalChange, 'updatedAt' | 'fromLeadStatus'>, base: { leadStatus: LeadStatus }): LocalChange {
  const current = readChanges()
  const prev = current[id]
  const next: LocalChange = { ...prev, ...patch, updatedAt: new Date().toISOString() }
  if (!next.fromLeadStatus) next.fromLeadStatus = base.leadStatus
  write({ ...current, [id]: next })
  return next
}

export function clearChanges() {
  write({})
}

export function exportChanges(snapshotExportedAt?: string): ChangesFile {
  return { version: 1, exportedAt: new Date().toISOString(), snapshotExportedAt, changes: readChanges() }
}

/** Parse an exported file; throws with a readable message when it is not one. */
export function parseChangesFile(text: string): ChangesFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON')
  }
  const file = parsed as Partial<ChangesFile> | null
  if (!file || file.version !== 1 || !file.changes || typeof file.changes !== 'object') {
    throw new Error('That file was not exported from Local changes')
  }
  return { version: 1, exportedAt: String(file.exportedAt ?? ''), snapshotExportedAt: file.snapshotExportedAt, changes: sanitizeChanges(file.changes) }
}

/** Merge an exported file into the overlay; per business the newer edit wins. Returns how many were taken. */
export function importChanges(file: ChangesFile): number {
  const current = readChanges()
  const next: ChangeMap = { ...current }
  let merged = 0
  for (const [id, change] of Object.entries(file.changes)) {
    const existing = next[id]
    if (existing && existing.updatedAt >= change.updatedAt) continue
    next[id] = { ...change, fromLeadStatus: existing?.fromLeadStatus ?? change.fromLeadStatus }
    merged++
  }
  write(next)
  return merged
}

type Overlayable = Pick<BusinessListItem, 'leadStatus' | 'notes' | 'lastContactedAt' | 'updatedAt'>

/** Apply a local change on top of a snapshot record (list item or full business). */
export function applyChange<T extends Overlayable>(item: T, change: LocalChange | undefined): T {
  if (!change) return item
  const patch: Partial<Overlayable> = { updatedAt: change.updatedAt }
  if (change.leadStatus !== undefined) patch.leadStatus = change.leadStatus
  if (change.notes !== undefined) patch.notes = change.notes
  if (change.lastContactedAt !== undefined) patch.lastContactedAt = change.lastContactedAt
  return { ...item, ...patch }
}
