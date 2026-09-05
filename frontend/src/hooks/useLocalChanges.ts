import { useSyncExternalStore } from 'react'
import { readChanges, subscribe } from '../lib/api/static/overlay'

/** The browser-local status/notes edits of the static build, re-rendering on every change. */
export function useLocalChanges() {
  const changes = useSyncExternalStore(subscribe, readChanges, readChanges)
  return { changes, count: Object.keys(changes).length }
}
