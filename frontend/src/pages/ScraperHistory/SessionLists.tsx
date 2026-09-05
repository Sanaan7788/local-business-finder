import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { TONE } from '../../lib/tones'
import { mapsSearchUrl } from '../../lib/urls'
import { PriorityBadge } from '../../components/business/LeadBadges'
import { Badge } from '../../components/ui/Badge'
import { CopyButton } from '../../components/ui/CopyButton'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Priority } from '../../types/business'
import type { ErrorEntry, SavedEntry, SkippedEntry } from '../../types/scraper'
import { CreateProfileButton } from './CreateProfileButton'

const Hint = ({ children }: { children: string }) => <p className="mb-3 text-xs text-fg-subtle">{children}</p>

const MapsLink = ({ name }: { name: string }) => (
  <a
    href={mapsSearchUrl(name)}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Search ${name} on Google Maps`}
    className="text-xs text-primary hover:underline"
  >
    Search Maps →
  </a>
)

export function SavedList({ entries }: { entries: SavedEntry[] }) {
  if (entries.length === 0) return <EmptyState size="sm" title="Nothing saved this session" />
  return (
    <div className="space-y-2">
      <Hint>Full profiles — click a name to open, copy the phone for outreach.</Hint>
      {entries.map(b => (
        <div key={b.id} className="rounded-lg border p-3 transition-colors hover:border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link to={`/businesses/${b.id}`} className="text-sm font-semibold text-primary hover:underline">{b.name}</Link>
              <p className="mt-0.5 text-xs text-fg-subtle">{b.address}</p>
              {b.phone ? (
                <p className="mt-1 flex items-center gap-1 font-mono text-xs text-fg-muted">📞 {b.phone} <CopyButton text={b.phone} /></p>
              ) : (
                <p className="mt-1 text-xs text-fg-subtle">No phone</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <PriorityBadge priority={b.priority as Priority} score={b.priorityScore} />
              {!b.website && <p className={cn('mt-1 text-xs font-medium', TONE.danger.text)}>No website</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkippedList({ entries }: { entries: SkippedEntry[] }) {
  if (entries.length === 0) return <EmptyState size="sm" title="No duplicates skipped" />
  return (
    <div className="space-y-2">
      <Hint>Already in your database — open the existing record.</Hint>
      {entries.map((s, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{s.name}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">{s.address}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone="warning">{s.reason}</Badge>
              <Link to={`/businesses/${s.existingId}`} className="text-xs text-primary hover:underline">view existing →</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorList({ entries, zipcode, category }: { entries: ErrorEntry[]; zipcode: string; category: string }) {
  const navigate = useNavigate()
  if (entries.length === 0) return <EmptyState size="sm" title="No errors" />
  return (
    <div className="space-y-2">
      <Hint>Found on Maps but could not be scraped. Create a stub profile to track manually, or search Maps to fill in the details.</Hint>
      {entries.map((e, i) => (
        <div key={i} className={cn('rounded-lg border p-3', TONE.danger.panel)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{e.name}</p>
              <p className={cn('mt-0.5 text-xs', TONE.danger.text)}>{e.message}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <MapsLink name={e.name} />
              <CreateProfileButton name={e.name} zipcode={zipcode} category={category} onCreated={id => navigate(`/businesses/${id}`)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FoundNamesList({
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
  const [createdIds, setCreatedIds] = useState<Record<string, string>>({})
  if (names.length === 0) return <EmptyState size="sm" title="No card names recorded" />

  const savedByName = new Map(savedList.map(b => [b.name.toLowerCase(), b]))

  return (
    <div>
      <Hint>{`All ${names.length} businesses found on Maps. Green = saved to the database; the rest can be created as stub profiles.`}</Hint>
      <div className="space-y-1.5">
        {names.map((name, i) => {
          const saved = savedByName.get(name.toLowerCase())
          const createdId = createdIds[name]
          return (
            <div
              key={i}
              className={cn('flex items-center justify-between gap-2 rounded-lg border px-3 py-2', saved ? TONE.success.panel : 'bg-surface-2')}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm text-fg">{name}</span>
                {saved?.phone && <span className="ml-2 font-mono text-xs text-fg-subtle">{saved.phone}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {saved ? (
                  <Link to={`/businesses/${saved.id}`} className={cn('text-xs font-medium hover:underline', TONE.success.text)}>View profile →</Link>
                ) : createdId ? (
                  <Link to={`/businesses/${createdId}`} className="text-xs font-medium text-primary hover:underline">Edit profile →</Link>
                ) : (
                  <>
                    <MapsLink name={name} />
                    <CreateProfileButton name={name} zipcode={zipcode} category={category} onCreated={id => setCreatedIds(prev => ({ ...prev, [name]: id }))} />
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
