import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useBusiness,
  useUpdateStatus,
  useUpdateNotes,
  useUpdateProfile,
  useAnalyze,
  useGenerateContentBrief,
  useGenerateWebsite,
} from '../hooks/useBusinesses'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PRIORITY_COLORS } from '../types/business'
import type { LeadStatus } from '../types/business'

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Editable field — shows value when viewing, input when editing
// ---------------------------------------------------------------------------
function EditableField({
  label,
  value,
  editing,
  onChange,
  type = 'text',
  placeholder,
  href,
}: {
  label: string
  value: string | number | null | undefined
  editing: boolean
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'url' | 'tel'
  placeholder?: string
  href?: string
}) {
  const display = value !== null && value !== undefined && value !== '' ? String(value) : null

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : display ? (
        href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{display}</a>
        ) : (
          <p className="text-sm font-medium text-gray-900">{display}</p>
        )
      ) : (
        <p className="text-sm text-gray-400">—</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab — view + inline edit
// ---------------------------------------------------------------------------
function OverviewTab({ business }: { business: any }) {
  const updateProfile = useUpdateProfile()
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {editing ? 'Editing — fill in any missing details manually' : 'Click Edit to update any field manually'}
        </p>
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

      {/* AI summary (read-only) */}
      {business.summary && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">AI Summary</p>
          <p className="text-sm text-blue-900">{business.summary}</p>
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

// ---------------------------------------------------------------------------
// Keywords tab
// ---------------------------------------------------------------------------

const KEYWORD_GROUPS = [
  { key: 'serviceKeywords',    label: 'Services',    color: 'bg-blue-50 border-blue-200 text-blue-800',    dot: 'bg-blue-400' },
  { key: 'locationKeywords',   label: 'Location',    color: 'bg-green-50 border-green-200 text-green-800',  dot: 'bg-green-400' },
  { key: 'reputationKeywords', label: 'Reputation',  color: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-400' },
  { key: 'searchPhrases',      label: 'Search Phrases', color: 'bg-orange-50 border-orange-200 text-orange-800', dot: 'bg-orange-400' },
] as const

function KeywordsTab({ business, onAnalyze, analyzing }: { business: any; onAnalyze: () => void; analyzing: boolean }) {
  const [copied, setCopied] = useState(false)
  const keywords: string[] = business.keywords ?? []
  const cats = business.keywordCategories as Record<string, string[]> | null

  const copyAll = () => {
    navigator.clipboard.writeText(keywords.join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Website & SEO Keywords</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Categorised by purpose — use each group where it matters most in website copy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {keywords.length > 0 && (
            <button
              onClick={copyAll}
              className="text-xs border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy All'}
            </button>
          )}
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {analyzing ? 'Generating…' : keywords.length > 0 ? 'Regenerate' : 'Generate Keywords'}
          </button>
        </div>
      </div>

      {keywords.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400 text-sm mb-1">No keywords yet.</p>
          <p className="text-gray-400 text-xs">
            Click "Generate Keywords" — uses business info, description, and stored review excerpts.
          </p>
        </div>
      ) : cats ? (
        // Categorised view
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {KEYWORD_GROUPS.map(({ key, label, color, dot }) => {
            const group: string[] = cats[key] ?? []
            if (group.length === 0) return null
            return (
              <div key={key} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</p>
                  <span className="text-xs text-gray-400 ml-auto">{group.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.map((k: string) => (
                    <span key={k} className={`border px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Legacy flat view (older records without categories)
        <div className="flex flex-wrap gap-2">
          {keywords.map((k: string) => (
            <span key={k} className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {k}
            </span>
          ))}
        </div>
      )}

      {keywords.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1 font-medium">All keywords — comma-separated (for prompts / meta tags)</p>
          <p className="text-xs text-gray-700 font-mono leading-relaxed break-words">
            {keywords.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insights tab
// ---------------------------------------------------------------------------
function InsightsTab({ business, onAnalyze, analyzing }: { business: any; onAnalyze: () => void; analyzing: boolean }) {
  if (!business.insights) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No insights generated yet.</p>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {analyzing ? 'Analyzing… (may take 2–3 min)' : 'Generate AI Analysis'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Generates keywords, summary, and insights</p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={onAnalyze} disabled={analyzing} className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50">
          {analyzing ? 'Re-analyzing…' : 'Re-analyze'}
        </button>
      </div>
      <div className="bg-amber-50 rounded-lg p-4">
        <p className="text-xs font-medium text-amber-700 mb-1">Why they need a website</p>
        <p className="text-sm text-amber-900">{business.insights.whyNeedsWebsite}</p>
      </div>
      <div className="bg-orange-50 rounded-lg p-4">
        <p className="text-xs font-medium text-orange-700 mb-1">What's missing online</p>
        <p className="text-sm text-orange-900">{business.insights.whatsMissingOnline}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Opportunities</p>
        <ul className="space-y-1.5">
          {business.insights.opportunities.map((o: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-500 mt-0.5">◆</span>{o}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Content Brief tab
// ---------------------------------------------------------------------------
function ContentBriefTab({
  business,
  onGenerate,
  generating,
}: {
  business: any
  onGenerate: () => void
  generating: boolean
}) {
  const [copiedFacts, setCopiedFacts] = useState(false)
  const [copiedAssumptions, setCopiedAssumptions] = useState(false)
  const brief = business.contentBrief as { confirmedFacts: string; assumptions: string } | null

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!brief) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">No content brief generated yet.</p>
        <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto">
          The content brief describes the business in detail — what it sells, what customers love,
          and reasonable assumptions. It feeds directly into website generation.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating…' : 'Generate Content Brief'}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Run AI Analysis first for best results (keywords + summary improve the brief).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Content Brief</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Feeds into website generation. Confirmed facts are used as real content; assumptions fill gaps.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Confirmed Facts */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-green-800">Confirmed Facts</p>
              <p className="text-xs text-green-600 mt-0.5">What we actually know from the data</p>
            </div>
            <button
              onClick={() => copyText(brief.confirmedFacts, setCopiedFacts)}
              className="text-xs text-green-700 border border-green-300 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors"
            >
              {copiedFacts ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed font-sans">
            {brief.confirmedFacts}
          </pre>
        </div>

        {/* Assumptions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">Intelligent Assumptions</p>
              <p className="text-xs text-amber-600 mt-0.5">Reasonable inferences — not confirmed</p>
            </div>
            <button
              onClick={() => copyText(brief.assumptions, setCopiedAssumptions)}
              className="text-xs text-amber-700 border border-amber-300 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
            >
              {copiedAssumptions ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed font-sans">
            {brief.assumptions}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Website tab
// ---------------------------------------------------------------------------
function WebsiteTab({ business, onGenerate, generating }: { business: any; onGenerate: () => void; generating: boolean }) {
  const [showCode, setShowCode] = useState(false)
  if (!business.generatedWebsiteCode) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No website generated yet.</p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating… (may take 1–2 min)' : 'Generate Website'}
        </button>
        <p className="text-xs text-gray-400 mt-2">AI will write a complete HTML website</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowCode(s => !s)} className="text-sm text-blue-600 hover:text-blue-800">
          {showCode ? 'Hide Code' : 'Show Code'}
        </button>
        <CopyButton text={business.generatedWebsiteCode} />
        <button onClick={onGenerate} disabled={generating} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
        <span className="text-xs text-gray-400 ml-auto">{Math.round(business.generatedWebsiteCode.length / 1024)}KB</span>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b border-gray-200">Preview</div>
        <iframe srcDoc={business.generatedWebsiteCode} className="w-full h-96 bg-white" sandbox="allow-same-origin" title="Website preview" />
      </div>
      {showCode && (
        <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-96 font-mono">
          {business.generatedWebsiteCode}
        </pre>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CRM tab
// ---------------------------------------------------------------------------
function CRMTab({ business }: { business: any }) {
  const updateStatus = useUpdateStatus()
  const updateNotes = useUpdateNotes()
  const [notes, setNotes] = useState(business.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)

  const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
    new: ['qualified', 'rejected'],
    qualified: ['contacted', 'rejected'],
    contacted: ['interested', 'rejected', 'qualified'],
    interested: ['closed', 'rejected', 'contacted'],
    closed: [],
    rejected: ['new'],
  }
  const allowed = TRANSITIONS[business.leadStatus as LeadStatus] ?? []

  const handleSaveNotes = async () => {
    await updateNotes.mutateAsync({ id: business.id, notes: notes || null })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-500 mb-2">Current Status</p>
        <Badge className={LEAD_STATUS_COLORS[business.leadStatus as LeadStatus]}>
          {LEAD_STATUS_LABELS[business.leadStatus as LeadStatus]}
        </Badge>
      </div>
      {allowed.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Move to</p>
          <div className="flex flex-wrap gap-2">
            {allowed.map(s => (
              <button
                key={s}
                onClick={() => updateStatus.mutate({ id: business.id, status: s })}
                disabled={updateStatus.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                  s === 'rejected' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                }`}
              >
                → {LEAD_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 mb-2">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          placeholder="Add notes about this lead…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleSaveNotes}
            disabled={updateNotes.isPending}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {updateNotes.isPending ? 'Saving…' : 'Save Notes'}
          </button>
          {notesSaved && <span className="text-green-600 text-xs">Saved ✓</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-1">Priority Score</p>
          <Badge className={PRIORITY_COLORS[business.priority as any]}>{business.priority} ({business.priorityScore})</Badge>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Last Contacted</p>
          <p className="text-sm">{business.lastContactedAt ? new Date(business.lastContactedAt).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Created</p>
          <p className="text-sm">{new Date(business.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Updated</p>
          <p className="text-sm">{new Date(business.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deployment tab
// ---------------------------------------------------------------------------
function DeploymentTab({ business }: { business: any }) {
  return (
    <div className="space-y-4">
      {business.deployedUrl ? (
        <>
          <div className="flex gap-3">
            {business.githubUrl && (
              <a href={business.githubUrl} target="_blank" rel="noreferrer"
                className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                GitHub →
              </a>
            )}
            <a href={business.deployedUrl} target="_blank" rel="noreferrer"
              className="text-sm text-white bg-black px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              Open Live Site →
            </a>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b">{business.deployedUrl}</div>
            <iframe src={business.deployedUrl} className="w-full h-96 bg-white" title="Deployed site" />
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-2">Not deployed yet.</p>
          <p className="text-xs">Generate a website first, then deploy.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main detail page
// ---------------------------------------------------------------------------
const TABS = ['Overview', 'Keywords', 'Insights', 'Content Brief', 'Website', 'CRM', 'Deployment'] as const
type Tab = typeof TABS[number]

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: business, isLoading, isError } = useBusiness(id!)
  const analyze = useAnalyze()
  const generateContentBrief = useGenerateContentBrief()
  const generateWebsite = useGenerateWebsite()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  if (isLoading) return <div className="p-12 text-center text-gray-500">Loading…</div>
  if (isError || !business) return (
    <div className="p-12 text-center">
      <p className="text-red-500 mb-4">Business not found.</p>
      <button onClick={() => navigate('/businesses')} className="text-blue-600 hover:underline text-sm">← Back to list</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{business.address || <span className="italic">No address — click Edit to add</span>}</p>
          </div>
          <div className="flex gap-2 mt-1">
            <Badge className={PRIORITY_COLORS[business.priority]}>{business.priority} priority</Badge>
            <Badge className={LEAD_STATUS_COLORS[business.leadStatus]}>{LEAD_STATUS_LABELS[business.leadStatus]}</Badge>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
              {tab === 'Keywords' && business.keywords?.length > 0 && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Insights' && business.insights && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Content Brief' && business.contentBrief && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Website' && business.generatedWebsiteCode && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Deployment' && business.deployedUrl && <span className="ml-1 text-xs text-green-500">✓</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'Overview' && <OverviewTab business={business} />}
        {activeTab === 'Keywords' && (
          <KeywordsTab business={business} onAnalyze={() => analyze.mutate(id!)} analyzing={analyze.isPending} />
        )}
        {activeTab === 'Insights' && (
          <InsightsTab business={business} onAnalyze={() => analyze.mutate(id!)} analyzing={analyze.isPending} />
        )}
        {activeTab === 'Content Brief' && (
          <ContentBriefTab
            business={business}
            onGenerate={() => generateContentBrief.mutate(id!)}
            generating={generateContentBrief.isPending}
          />
        )}
        {activeTab === 'Website' && (
          <WebsiteTab business={business} onGenerate={() => generateWebsite.mutate(id!)} generating={generateWebsite.isPending} />
        )}
        {activeTab === 'CRM' && <CRMTab business={business} />}
        {activeTab === 'Deployment' && <DeploymentTab business={business} />}
      </div>
    </div>
  )
}
