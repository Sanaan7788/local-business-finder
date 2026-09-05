import type { BusinessListItem, LeadStatus } from './business'

// ---------------------------------------------------------------------------
// Static (GitHub Pages) build: the exported snapshot and the browser-local
// change overlay. Written by backend/src/scripts/export-static.ts and read by
// backend/src/scripts/import-changes.ts — keep the shapes in sync.
// ---------------------------------------------------------------------------

export interface SnapshotMeta {
  version: 1
  exportedAt: string
  total: number
  totalTokensUsed: number
}

/** public/data/index.json */
export interface SnapshotIndex {
  meta: SnapshotMeta
  items: BusinessListItem[]
}

/**
 * One business's local edits. `notes`/`lastContactedAt` use key presence rather
 * than null-coalescing because `null` means "cleared". `fromLeadStatus` is the
 * status the snapshot had when the first local edit was made; the importer uses
 * it to detect records that changed on the server in the meantime.
 */
export interface LocalChange {
  leadStatus?: LeadStatus
  fromLeadStatus?: LeadStatus
  notes?: string | null
  lastContactedAt?: string | null
  updatedAt: string
}

export type ChangeMap = Record<string, LocalChange>

/** The file produced by "Export as JSON" and consumed by `npm run import:changes`. */
export interface ChangesFile {
  version: 1
  exportedAt: string
  snapshotExportedAt?: string
  changes: ChangeMap
}
