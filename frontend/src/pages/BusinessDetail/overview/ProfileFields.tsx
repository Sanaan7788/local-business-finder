import { cn } from '../../../lib/cn'
import { TONE } from '../../../lib/tones'
import { EditableField } from '../../../components/ui/EditableField'
import type { Business } from '../../../types/business'
import type { ProfileDraft } from './useProfileDraft'

export function ProfileFields({
  business,
  draft,
  editing,
  setField,
}: {
  business: Business
  draft: ProfileDraft
  editing: boolean
  setField: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void
}) {
  const text = (key: keyof ProfileDraft) => (v: string) => setField(key, v as ProfileDraft[typeof key])

  return (
    <div className="grid grid-cols-2 gap-4">
      <EditableField label="Name" value={draft.name} editing={editing} onChange={text('name')} />
      <EditableField label="Category" value={draft.category} editing={editing} onChange={text('category')} placeholder="e.g. nail salons" />
      <EditableField label="Phone" value={draft.phone} editing={editing} onChange={text('phone')} type="tel" />
      <EditableField label="Zipcode / Location" value={draft.zipcode} editing={editing} onChange={text('zipcode')} />
      <div className="col-span-2">
        <EditableField label="Address" value={draft.address} editing={editing} onChange={text('address')} />
      </div>
      <EditableField label="Rating" value={draft.rating} editing={editing} onChange={text('rating')} type="number" placeholder="e.g. 4.2" />
      <EditableField label="Review Count" value={draft.reviewCount} editing={editing} onChange={text('reviewCount')} type="number" />

      <div>
        <p className="mb-1 text-xs text-fg-muted">Has Website</p>
        {editing ? (
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={draft.website} onChange={e => setField('website', e.target.checked)} className="accent-primary" />
            {draft.website ? 'Yes' : 'No'}
          </label>
        ) : (
          <span className={cn('text-sm font-medium', business.website ? TONE.success.text : TONE.danger.text)}>
            {business.website ? 'Yes' : 'No website'}
          </span>
        )}
      </div>

      <EditableField
        label="Website URL"
        value={draft.websiteUrl}
        editing={editing}
        onChange={text('websiteUrl')}
        type="url"
        placeholder="https://..."
        href={business.websiteUrl ?? undefined}
      />

      <div className="col-span-2">
        <EditableField
          label="Google Maps URL"
          value={draft.googleMapsUrl}
          editing={editing}
          onChange={text('googleMapsUrl')}
          type="url"
          placeholder="https://maps.google.com/..."
          href={business.googleMapsUrl ?? undefined}
        />
      </div>
    </div>
  )
}
