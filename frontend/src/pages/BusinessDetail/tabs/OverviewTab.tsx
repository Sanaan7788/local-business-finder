import { useState } from 'react'
import { useRescrape, useUpdateProfile, useUpdateStatus } from '../../../hooks/useBusinesses'
import { useTransientFlag } from '../../../hooks/useTransientFlag'
import { cn } from '../../../lib/cn'
import { IS_STATIC } from '../../../lib/env'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatNumber } from '../../../lib/format'
import { TONE } from '../../../lib/tones'
import { mapsSearchUrl } from '../../../lib/urls'
import { ServerOnly } from '../../../components/ServerOnly'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { CopyButton } from '../../../components/ui/CopyButton'
import { FormField, Textarea } from '../../../components/ui/Field'
import type { Business } from '../../../types/business'
import { useProfileDraft } from '../overview/useProfileDraft'
import { ProfileFields } from '../overview/ProfileFields'
import { ScrapedDataSection } from '../overview/ScrapedDataSection'

export function OverviewTab({ business }: { business: Business }) {
  const updateProfile = useUpdateProfile()
  const updateStatus = useUpdateStatus()
  const rescrape = useRescrape()
  const [editing, setEditing] = useState(false)
  const [saved, flashSaved] = useTransientFlag()
  const { draft, setField, startEdit, toPayload } = useProfileDraft(business)

  const shortlisted = business.leadStatus === 'qualified'
  const isStub = !business.phone && !business.address

  const save = async () => {
    await updateProfile.mutateAsync({ id: business.id, data: toPayload() })
    setEditing(false)
    flashSaved()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="xs"
          variant={shortlisted ? 'primary' : 'secondary'}
          loading={updateStatus.isPending}
          onClick={() => updateStatus.mutate({ id: business.id, status: shortlisted ? 'new' : 'qualified' })}
        >
          {shortlisted ? '★ Shortlisted — click to remove' : '☆ Add to Shortlist'}
        </Button>

        {/* Re-scraping and profile edits write to the database, so they only exist in the live app */}
        <ServerOnly>
          <div className="flex flex-wrap items-center gap-2">
            {saved && <span className={cn('text-xs', TONE.success.text)}>Saved ✓</span>}
            {rescrape.isError && <span className={cn('text-xs', TONE.danger.text)}>{getApiErrorMessage(rescrape.error, 'Re-scrape failed')}</span>}
            {rescrape.isSuccess && <span className={cn('text-xs', TONE.success.text)}>Re-scraped ✓</span>}
            {!editing && business.googleMapsUrl && (
              <Button size="xs" loading={rescrape.isPending} onClick={() => rescrape.mutate(business.id)}>
                {rescrape.isPending ? 'Scraping…' : 'Re-scrape'}
              </Button>
            )}
            {editing ? (
              <>
                <Button size="xs" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="xs" variant="primary" loading={updateProfile.isPending} onClick={() => void save()}>
                  {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button size="xs" onClick={() => { startEdit(); setEditing(true) }}>Edit</Button>
            )}
          </div>
        </ServerOnly>
      </div>

      <ProfileFields business={business} draft={draft} editing={editing} setField={setField} />

      {editing ? (
        <FormField label="Description">
          {id => (
            <Textarea
              id={id}
              rows={2}
              value={draft.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Business description from Maps or manually entered"
              className="resize-none"
            />
          )}
        </FormField>
      ) : (
        <div>
          <p className="mb-1 text-xs text-fg-muted">Description</p>
          <p className={business.description ? 'text-sm text-fg-muted' : 'text-sm text-fg-subtle'}>{business.description || '—'}</p>
        </div>
      )}

      {business.tokensUsed > 0 && (
        <p className="text-xs text-fg-subtle">{formatNumber(business.tokensUsed)} AI tokens used on this profile</p>
      )}

      {!editing && business.phone && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <span className="font-mono text-sm text-fg">📞 {business.phone}</span>
          <CopyButton text={business.phone} />
        </div>
      )}

      <ScrapedDataSection business={business} />

      {isStub && (
        <Alert tone="warning">
          This is a stub profile created from a found name.{' '}
          {IS_STATIC ? 'Fill in the phone, address and other details in the local app, or' : <>Click <strong>Edit</strong> to fill in the phone, address and other details, or</>}{' '}
          <a href={mapsSearchUrl(business.name)} target="_blank" rel="noopener noreferrer" className="underline">search Maps →</a>
        </Alert>
      )}
    </div>
  )
}
