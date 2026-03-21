import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBusiness, useUpdateStatus, useUpdateNotes, useAnalyze, useGenerateWebsite } from '../hooks/useBusinesses'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PRIORITY_COLORS } from '../types/business'
import type { LeadStatus } from '../types/business'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Tab components
// ---------------------------------------------------------------------------

function OverviewTab({ business }: { business: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Phone</p>
          <p className="text-sm font-medium">{business.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Category</p>
          <p className="text-sm font-medium">{business.category}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Address</p>
          <p className="text-sm font-medium">{business.address}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Rating</p>
          <p className="text-sm font-medium">
            {business.rating !== null ? `${business.rating}★` : '—'}
            {business.reviewCount !== null && <span className="text-gray-400 ml-1">({business.reviewCount} reviews)</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Website</p>
          {business.website && business.websiteUrl
            ? <a href={business.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{business.websiteUrl}</a>
            : <p className="text-sm text-red-500 font-medium">No website</p>
          }
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Google Maps</p>
          {business.googleMapsUrl
            ? <a href={business.googleMapsUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open in Maps</a>
            : <p className="text-sm text-gray-400">—</p>
          }
        </div>
      </div>
      {business.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-700">{business.description}</p>
        </div>
      )}
      {business.summary && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">AI Summary</p>
          <p className="text-sm text-blue-900">{business.summary}</p>
        </div>
      )}
      {business.keywords.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">SEO Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {business.keywords.map((k: string) => (
              <span key={k} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
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
              <span className="text-blue-500 mt-0.5">◆</span>
              {o}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

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
        <button
          onClick={() => setShowCode(s => !s)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showCode ? 'Hide Code' : 'Show Code'}
        </button>
        <CopyButton text={business.generatedWebsiteCode} />
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
        <span className="text-xs text-gray-400 ml-auto">{Math.round(business.generatedWebsiteCode.length / 1024)}KB</span>
      </div>

      {/* Live preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b border-gray-200">Preview</div>
        <iframe
          srcDoc={business.generatedWebsiteCode}
          className="w-full h-96 bg-white"
          sandbox="allow-same-origin"
          title="Website preview"
        />
      </div>

      {showCode && (
        <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-96 font-mono">
          {business.generatedWebsiteCode}
        </pre>
      )}
    </div>
  )
}

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
                  s === 'rejected'
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50'
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
          <Badge className={PRIORITY_COLORS[business.priority as any]}>
            {business.priority} ({business.priorityScore})
          </Badge>
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
            <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b flex items-center justify-between">
              <span>{business.deployedUrl}</span>
            </div>
            <iframe
              src={business.deployedUrl}
              className="w-full h-96 bg-white"
              title="Deployed site"
            />
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-2">Not deployed yet.</p>
          <p className="text-xs">Generate a website first, then deploy from Section 8.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main detail page
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Insights', 'Website', 'CRM', 'Deployment'] as const
type Tab = typeof TABS[number]

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: business, isLoading, isError } = useBusiness(id!)
  const analyze = useAnalyze()
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
      {/* Header */}
      <div>
        <button onClick={() => navigate('/businesses')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
          ← Back to Businesses
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{business.address}</p>
          </div>
          <div className="flex gap-2 mt-1">
            <Badge className={PRIORITY_COLORS[business.priority]}>
              {business.priority} priority
            </Badge>
            <Badge className={LEAD_STATUS_COLORS[business.leadStatus]}>
              {LEAD_STATUS_LABELS[business.leadStatus]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
              {tab === 'Insights' && business.insights && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Website' && business.generatedWebsiteCode && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Deployment' && business.deployedUrl && <span className="ml-1 text-xs text-green-500">✓</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'Overview' && <OverviewTab business={business} />}
        {activeTab === 'Insights' && (
          <InsightsTab
            business={business}
            onAnalyze={() => analyze.mutate(id!)}
            analyzing={analyze.isPending}
          />
        )}
        {activeTab === 'Website' && (
          <WebsiteTab
            business={business}
            onGenerate={() => generateWebsite.mutate(id!)}
            generating={generateWebsite.isPending}
          />
        )}
        {activeTab === 'CRM' && <CRMTab business={business} />}
        {activeTab === 'Deployment' && <DeploymentTab business={business} />}
      </div>
    </div>
  )
}
