import { useState } from 'react'
import { useAnalyzeWebsite, useUpdateWebsiteAnalysis, useGenerateOutreachEmail } from '../../../hooks/useBusinesses'
import type { WebsiteAnalysis } from '../../../types/business'

export function WebsiteAnalysisSection({ business }: { business: any }) {
  const analyzeWebsite = useAnalyzeWebsite()
  const updateWebsiteAnalysis = useUpdateWebsiteAnalysis()
  const generateOutreachEmail = useGenerateOutreachEmail()

  const analysis = business.websiteAnalysis as WebsiteAnalysis | null
  const outreachEmail = business.outreach?.email as { subject: string; body: string } | null
  const scrapedEmails: string[] = business.scrapedEmails ?? []

  // Edit state
  const [editingStructured, setEditingStructured] = useState(false)
  const [structuredDraft, setStructuredDraft] = useState('')
  const [editingImprovements, setEditingImprovements] = useState(false)
  const [improvementsDraft, setImprovementsDraft] = useState('')
  const [savingStructured, setSavingStructured] = useState(false)
  const [savingImprovements, setSavingImprovements] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [copiedBody, setCopiedBody] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const copy = (text: string, cb: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    cb(true)
    setTimeout(() => cb(false), 2000)
  }

  const scoreColor = (s: number | null) => {
    if (s === null) return 'bg-gray-100 text-gray-500'
    if (s <= 4) return 'bg-red-100 text-red-700'
    if (s <= 7) return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  const saveStructured = async () => {
    setSavingStructured(true)
    await updateWebsiteAnalysis.mutateAsync({ id: business.id, data: { structured: structuredDraft } })
    setSavingStructured(false)
    setEditingStructured(false)
  }

  const saveImprovements = async () => {
    setSavingImprovements(true)
    const list = improvementsDraft.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    await updateWebsiteAnalysis.mutateAsync({ id: business.id, data: { improvements: list } })
    setSavingImprovements(false)
    setEditingImprovements(false)
  }

  if (!business.websiteUrl) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
        <p className="text-sm text-gray-500">No website URL — add a website URL in the Overview tab first.</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Current Website Structure</p>
            <p className="text-xs text-gray-500 mt-0.5">No analysis yet — crawl and analyse the existing website</p>
          </div>
          <button
            onClick={() => analyzeWebsite.mutate(business.id)}
            disabled={analyzeWebsite.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {analyzeWebsite.isPending ? 'Crawling… (may take 60s)' : 'Analyze Website'}
          </button>
        </div>
        {analyzeWebsite.isError && (
          <p className="text-xs text-red-600 mt-3">{(analyzeWebsite.error as any)?.response?.data?.error ?? 'Analysis failed'}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Current Website Structure</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {analysis.pagesVisited} page{analysis.pagesVisited !== 1 ? 's' : ''} crawled ·{' '}
            {new Date(analysis.crawledAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => analyzeWebsite.mutate(business.id)}
          disabled={analyzeWebsite.isPending}
          className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          {analyzeWebsite.isPending ? 'Re-crawling…' : 'Re-analyze'}
        </button>
      </div>

      {/* Score */}
      <div className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4">
        <div className={`text-2xl font-bold px-4 py-2 rounded-lg min-w-[60px] text-center ${scoreColor(analysis.score)}`}>
          {analysis.score ?? '—'}<span className="text-sm font-normal">/10</span>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Website Quality Score</p>
          <p className="text-sm text-gray-700">{analysis.scoreReason ?? '—'}</p>
        </div>
      </div>

      {/* LLM Structured Analysis */}
      <div className="border border-indigo-200 rounded-xl overflow-hidden">
        <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between border-b border-indigo-200">
          <p className="text-sm font-semibold text-indigo-800">LLM Structured Analysis</p>
          <button
            onClick={() => {
              setStructuredDraft(analysis.structured ?? '')
              setEditingStructured(e => !e)
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            {editingStructured ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div className="p-4">
          {editingStructured ? (
            <div className="space-y-2">
              <textarea
                value={structuredDraft}
                onChange={e => setStructuredDraft(e.target.value)}
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
              <button
                onClick={saveStructured}
                disabled={savingStructured}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingStructured ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
              {analysis.structured ?? '—'}
            </pre>
          )}
        </div>
      </div>

      {/* Improvements */}
      <div className="border border-amber-200 rounded-xl overflow-hidden">
        <div className="bg-amber-50 px-4 py-2.5 flex items-center justify-between border-b border-amber-200">
          <p className="text-sm font-semibold text-amber-800">Improvement Opportunities <span className="font-normal text-amber-600">(for your sales pitch)</span></p>
          <button
            onClick={() => {
              setImprovementsDraft((analysis.improvements ?? []).map(i => `• ${i}`).join('\n'))
              setEditingImprovements(e => !e)
            }}
            className="text-xs text-amber-600 hover:text-amber-800"
          >
            {editingImprovements ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div className="p-4">
          {editingImprovements ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">One improvement per line</p>
              <textarea
                value={improvementsDraft}
                onChange={e => setImprovementsDraft(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
              <button
                onClick={saveImprovements}
                disabled={savingImprovements}
                className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {savingImprovements ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {(analysis.improvements ?? []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-500 mt-0.5 shrink-0">◆</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Outreach Email */}
      <div className="border border-blue-200 rounded-xl overflow-hidden">
        <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between border-b border-blue-200">
          <div>
            <p className="text-sm font-semibold text-blue-800">Outreach Email</p>
            <p className="text-xs text-blue-600 mt-0.5">Personalised cold email based on the improvement opportunities above</p>
          </div>
          <button
            onClick={() => generateOutreachEmail.mutate(business.id)}
            disabled={generateOutreachEmail.isPending}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generateOutreachEmail.isPending ? 'Generating…' : outreachEmail ? 'Regenerate' : 'Generate Email'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Scraped email addresses */}
          {scrapedEmails.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Email addresses found on their website:</p>
              <div className="flex flex-wrap gap-2">
                {scrapedEmails.map((email, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1">
                    <span className="text-sm text-gray-800 font-mono">{email}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(email); setCopiedEmail(email); setTimeout(() => setCopiedEmail(null), 2000) }}
                      className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {copiedEmail === email ? '✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {scrapedEmails.length === 0 && !outreachEmail && (
            <p className="text-xs text-gray-400">No email addresses found on the website. You may need to find the owner's email manually.</p>
          )}
          {scrapedEmails.length === 0 && outreachEmail && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">No email addresses were found on the website — find the owner's contact manually before sending.</p>
          )}

          {generateOutreachEmail.isError && (
            <p className="text-xs text-red-600">{(generateOutreachEmail.error as any)?.response?.data?.error ?? 'Generation failed'}</p>
          )}

          {/* Generated email */}
          {outreachEmail && (
            <div className="space-y-3">
              {/* Subject */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-500">Subject</p>
                  <button
                    onClick={() => copy(outreachEmail.subject, setCopiedSubject)}
                    className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {copiedSubject ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-gray-900 font-medium">{outreachEmail.subject}</p>
              </div>

              {/* Body */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">Email body</p>
                  <button
                    onClick={() => copy(outreachEmail.body, setCopiedBody)}
                    className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {copiedBody ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">{outreachEmail.body}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw crawled data — collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowRaw(s => !s)}
          className="w-full bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <p className="text-sm font-semibold text-gray-700">Raw Extracted Data ({analysis.pagesVisited} pages)</p>
          <span className="text-xs text-gray-400">{showRaw ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showRaw && (
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {analysis.rawPages.map((page, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-mono text-blue-600 mb-1 break-all">{page.url}</p>
                <p className="text-xs font-medium text-gray-700 mb-1">{page.title}</p>
                {page.navLinks.length > 0 && (
                  <p className="text-xs text-gray-500 mb-1">Nav: {page.navLinks.join(' · ')}</p>
                )}
                {page.headings.length > 0 && (
                  <p className="text-xs text-gray-600 mb-1">Headings: {page.headings.join(' / ')}</p>
                )}
                {page.paragraphs.length > 0 && (
                  <p className="text-xs text-gray-500 line-clamp-3">{page.paragraphs.join(' ')}</p>
                )}
                <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                  <span>{page.images} images</span>
                  {page.hasContactForm && <span className="text-green-600">✓ Contact form</span>}
                  {page.hasPhone && <span className="text-green-600">✓ Phone</span>}
                  {page.hasEmail && <span className="text-green-600">✓ Email</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
