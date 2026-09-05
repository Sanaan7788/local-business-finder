import type { ReactNode } from 'react'
import { IS_STATIC } from '../lib/env'

/** Renders children only in the live app; the static (GitHub Pages) build shows `fallback` instead. */
export function ServerOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return IS_STATIC ? fallback : children
}
