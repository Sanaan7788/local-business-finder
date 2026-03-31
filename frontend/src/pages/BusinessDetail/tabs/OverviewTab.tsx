import { useState } from 'react'
import { useUpdateProfile, useUpdateStatus } from '../../../hooks/useBusinesses'
import { EditableField } from '../../../components/ui/EditableField'
import { CopyButton } from '../../../components/ui/CopyButton'

export function OverviewTab({ business }: { business: any }) {
  const updateProfile = useUpdateProfile()
  const updateStatus = useUpdateStatus()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local edit state — only used when editing=true
  const [draft, setDraft] = useState({
    name:          business.name ?? '',
    phone:         business.phone ?? '',
    address:       business.address ?? '',
    zipcode:       business.zipcode ?? '',
    category:      business.category ?? '',
    description:   business.description ?? '',
    website:       business.website ?? false,
    websiteUrl:    business.websiteUrl ?? '',
    rating:        business.rating ?? '',
    reviewCount:   business.reviewCount ?? '',
    googleMapsUrl: business.googleMapsUrl ?? '',
  })

  const startEdit = () => {
    setDraft({
      name:          business.name ?? '',
      phone:         business.phone ?? '',
      address:       business.address ?? '',
      zipcode:       business.zipcode ?? '',
      category:      business.category ?? '',
      description:   business.description ?? '',
      website:       business.website ?? false,
      websiteUrl:    business.websiteUrl ?? '',
      rating:        business.rating ?? '',
      reviewCount:   business.reviewCount ?? '',
      googleMapsUrl: business.googleMapsUrl ?? '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      id: business.id,
      data: {
        name:          draft.name || undefined,
        phone:         draft.phone || null,
        address:       draft.address || undefined,
        zipcode:       draft.zipcode || undefined,
        category:      draft.category || undefined,
        description:   draft.description || null,
        website:       draft.website,
        websiteUrl:    draft.websiteUrl || null,
        rating:        draft.rating !== '' ? Number(draft.rating) : null,
        reviewCount:   draft.reviewCount !== '' ? Number(draft.reviewCount) : null,
        googleMapsUrl: draft.googleMapsUrl || null,
      },
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (field: keyof typeof draft) => (v: string) => setDraft(d => ({ ...d, [field]: v }))

  return (
    <div className="space-y-5">
      {/* Edit toggle */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => updateStatus.mutate({ id: business.id, status: business.leadStatus === 'qualified' ? 'new' : 'qualified' })}
          disabled={updateStatus.isPending}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
            business.leadStatus === 'qualified'
              ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200'
          }`}
        >
          {business.leadStatus === 'qualified' ? '★ Shortlisted — click to remove' : '☆ Add to Shortlist'}
        </button>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Saved ✓</span>}
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1 rounded-lg"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <EditableField label="Name" value={draft.name} editing={editing} onChange={set('name')} />
        <EditableField label="Category" value={draft.category} editing={editing} onChange={set('category')} placeholder="e.g. nail salons" />
        <EditableField label="Phone" value={draft.phone} editing={editing} onChange={set('phone')} type="tel" />
        <EditableField label="Zipcode / Location" value={draft.zipcode} editing={editing} onChange={set('zipcode')} />
        <div className="col-span-2">
          <EditableField label="Address" value={draft.address} editing={editing} onChange={set('address')} />
        </div>
        <EditableField label="Rating" value={draft.rating} editing={editing} onChange={set('rating')} type="number" placeholder="e.g. 4.2" />
        <EditableField label="Review Count" value={draft.reviewCount} editing={editing} onChange={set('reviewCount')} type="number" />

        {/* Website field — checkbox + URL */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Has Website</p>
          {editing ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.website}
                onChange={e => setDraft(d => ({ ...d, website: e.target.checked }))}
                className="accent-blue-600"
              />
              {draft.website ? 'Yes' : 'No'}
            </label>
          ) : (
            business.website
              ? <span className="text-sm text-green-600 font-medium">Yes</span>
              : <span className="text-sm text-red-500 font-medium">No website</span>
          )}
        </div>

        <EditableField
          label="Website URL"
          value={draft.websiteUrl}
          editing={editing}
          onChange={set('websiteUrl')}
          type="url"
          placeholder="https://..."
          href={business.websiteUrl ?? undefined}
        />

        <div className="col-span-2">
          <EditableField
            label="Google Maps URL"
            value={draft.googleMapsUrl}
            editing={editing}
            onChange={set('googleMapsUrl')}
            type="url"
            placeholder="https://maps.google.com/..."
            href={business.googleMapsUrl ?? undefined}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Description</p>
        {editing ? (
          <textarea
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            rows={2}
            placeholder="Business description from Maps or manually entered"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        ) : (
          business.description
            ? <p className="text-sm text-gray-700">{business.description}</p>
            : <p className="text-sm text-gray-400">—</p>
        )}
      </div>

      {/* Phone quick-copy */}
      {!editing && business.phone && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-sm font-mono text-gray-800">📞 {business.phone}</span>
          <CopyButton text={business.phone} />
        </div>
      )}


      {/* Stub notice */}
      {!business.phone && !business.address && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          This is a stub profile created from a found name. Click <strong>Edit</strong> to fill in phone, address, and other details manually, or use the Maps link to look them up.
          {business.name && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(business.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-blue-600 hover:underline"
            >
              Search Maps →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
