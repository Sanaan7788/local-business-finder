import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { IS_STATIC } from '../../lib/env'
import { LLMSelector } from './LLMSelector'
import { LocalChangesWidget } from './LocalChangesWidget'
import { ScraperStatusPill } from './ScraperStatusPill'
import { SnapshotBadge } from './SnapshotBadge'
import { ThemeToggle } from './ThemeToggle'
import { TotalTokensCounter } from './TotalTokensCounter'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-fg shadow-card' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  )

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-surface shadow-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-fg">LB</span>
            <span className="hidden text-sm font-semibold text-fg sm:inline">Local Business Finder</span>
          </NavLink>

          <div className="flex items-center gap-2">
            <nav aria-label="Main" className="flex items-center gap-0.5">
              <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/businesses" className={navLinkClass}>Businesses</NavLink>
              <NavLink to="/history" className={navLinkClass}>History</NavLink>
            </nav>

            <span aria-hidden className="mx-1 h-5 w-px bg-line" />

            {/* The static build has no scraper or LLM to talk to; it shows the snapshot date and local edits instead. */}
            {IS_STATIC ? <SnapshotBadge /> : <ScraperStatusPill />}
            <TotalTokensCounter />
            {IS_STATIC ? <LocalChangesWidget /> : <LLMSelector />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t py-4 text-center text-xs text-fg-subtle">Local Business Finder</footer>
    </div>
  )
}
