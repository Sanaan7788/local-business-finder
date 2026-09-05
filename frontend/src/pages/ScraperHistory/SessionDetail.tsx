import { useState } from 'react'
import { useScrapeSession } from '../../hooks/useScraper'
import { cn } from '../../lib/cn'
import { formatDateTime, formatNumber } from '../../lib/format'
import { TONE, type Tone } from '../../lib/tones'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingBlock } from '../../components/ui/Spinner'
import { Tabs } from '../../components/ui/Tabs'
import { ErrorList, FoundNamesList, SavedList, SkippedList } from './SessionLists'

type ListKey = 'saved' | 'skipped' | 'errors' | 'found'

const dot = (tone: Tone) => <span aria-hidden className={cn('inline-block h-1.5 w-1.5 rounded-full', TONE[tone].dot)} />

export function SessionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isPending, isError, error, refetch } = useScrapeSession(id)
  const [tab, setTab] = useState<ListKey>('saved')

  if (isPending) return <Card padding="none"><LoadingBlock label="Loading session…" /></Card>
  if (isError || !data) return <Card padding="none"><ErrorState size="sm" error={error} onRetry={() => void refetch()} /></Card>

  return (
    <Card padding="none">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h3 className="font-semibold text-fg">{data.zipcode} — {data.category}</h3>
          <p className="mt-0.5 text-xs text-fg-subtle">{formatDateTime(data.startedAt)} → {formatDateTime(data.finishedAt)}</p>
          {data.tokensUsed > 0 && <p className={cn('mt-0.5 text-xs', TONE.purple.text)}>{formatNumber(data.tokensUsed)} tokens used</p>}
        </div>
        <Button variant="ghost" size="xs" aria-label="Close session details" onClick={onClose}>×</Button>
      </div>

      <Tabs
        aria-label="Session results"
        value={tab}
        onChange={setTab}
        className="px-4"
        items={[
          { key: 'saved', label: `Saved (${data.saved})`, badge: data.saved > 0 ? dot('success') : undefined },
          { key: 'skipped', label: `Skipped (${data.skipped})`, badge: data.skipped > 0 ? dot('warning') : undefined },
          { key: 'errors', label: `Errors (${data.errors})`, badge: data.errors > 0 ? dot('danger') : undefined },
          { key: 'found', label: `Found (${data.found})` },
        ]}
      />

      <div className="max-h-[520px] overflow-y-auto p-4">
        {tab === 'saved' && <SavedList entries={data.savedList} />}
        {tab === 'skipped' && <SkippedList entries={data.skippedList} />}
        {tab === 'errors' && <ErrorList entries={data.errorList} zipcode={data.zipcode} category={data.category} />}
        {tab === 'found' && <FoundNamesList names={data.foundNames} savedList={data.savedList} zipcode={data.zipcode} category={data.category} />}
      </div>
    </Card>
  )
}
