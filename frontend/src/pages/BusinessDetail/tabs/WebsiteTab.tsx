import { useState, useEffect } from 'react'
import { WebsiteAnalysisSection } from '../components/WebsiteAnalysisSection'
import { CopyButton } from '../../../components/ui/CopyButton'
import { useUpdateWebsitePrompt } from '../../../hooks/useBusinesses'
import type { Business } from '../../../types/business'

// ---------------------------------------------------------------------------
// Build the default prompt from all available business data
// (moved here from the removed PromptTab)
// ---------------------------------------------------------------------------
function buildPrompt(business: Business): string {
  const lines: string[] = []

  lines.push('You are a professional web developer. Build a complete, modern, single-page website for the following local business.')
  lines.push('Return only the complete HTML file — no explanation, no markdown, no code fences. The file must be self-contained (inline CSS and JS, no external dependencies).')
  lines.push('')

  lines.push('== BUSINESS INFORMATION ==')
  lines.push(`Name: ${business.name}`)
  lines.push(`Category: ${business.category}`)
  if (business.address)    lines.push(`Address: ${business.address}`)
  if (business.phone)      lines.push(`Phone: ${business.phone}`)
  if (business.websiteUrl) lines.push(`Current Website: ${business.websiteUrl}`)
  if (business.rating !== null) {
    lines.push(`Google Rating: ${business.rating}★ (${business.reviewCount ?? 0} reviews)`)
  }
  if (business.googleMapsUrl) lines.push(`Google Maps: ${business.googleMapsUrl}`)
  lines.push('')

  if (business.summary) {
    lines.push('== BUSINESS SUMMARY ==')
    lines.push(business.summary)
    lines.push('')
  }

  if (business.contentBrief) {
    lines.push('== CONFIRMED FACTS (use these as real content) ==')
    lines.push(business.contentBrief.confirmedFacts)
    lines.push('')
    lines.push('== INTELLIGENT ASSUMPTIONS (fill gaps with these) ==')
    lines.push(business.contentBrief.assumptions)
    lines.push('')
  }

  if (business.keywordCategories) {
    const kc = business.keywordCategories as any
    lines.push('== KEYWORDS TO USE IN COPY ==')
    if (kc.serviceKeywords?.length)    lines.push(`Services: ${kc.serviceKeywords.join(', ')}`)
    if (kc.locationKeywords?.length)   lines.push(`Location: ${kc.locationKeywords.join(', ')}`)
    if (kc.reputationKeywords?.length) lines.push(`Trust signals: ${kc.reputationKeywords.join(', ')}`)
    if (kc.searchPhrases?.length)      lines.push(`Search phrases: ${kc.searchPhrases.join(', ')}`)
    lines.push('')
  } else if (business.keywords?.length > 0) {
    lines.push('== KEYWORDS TO USE IN COPY ==')
    lines.push(business.keywords.join(', '))
    lines.push('')
  }

  if (business.insights) {
    lines.push('== BUSINESS INSIGHTS ==')
    lines.push(`Why they need a website: ${business.insights.whyNeedsWebsite}`)
    lines.push(`What\'s missing online: ${business.insights.whatsMissingOnline}`)
    if (business.insights.opportunities?.length > 0) {
      lines.push('Opportunities:')
      business.insights.opportunities.forEach(o => lines.push(`  - ${o}`))
    }
    lines.push('')
  }

  if (business.websiteAnalysis) {
    const wa = business.websiteAnalysis
    if (wa.structured) {
      lines.push('== EXISTING WEBSITE ANALYSIS ==')
      lines.push(wa.structured)
      lines.push('')
    }
    if (wa.improvements?.length > 0) {
      lines.push('== IMPROVEMENT OPPORTUNITIES (address these in the new site) ==')
      wa.improvements.forEach(i => lines.push(`  - ${i}`))
      lines.push('')
    }
  }

  if (business.reviewSnippets?.length > 0) {
    lines.push('== REAL CUSTOMER REVIEWS (use quotes in testimonial section) ==')
    business.reviewSnippets.slice(0, 5).forEach(r => lines.push(`  "${r}"`))
    lines.push('')
  }

  lines.push('== DESIGN REQUIREMENTS ==')
  lines.push('- Mobile-first, fully responsive design')
  lines.push('- Modern, professional look appropriate for the business category')
  lines.push('- Sections: Hero, About, Services, Testimonials (if reviews available), Contact')
  lines.push('- Include the business phone number and address prominently')
  lines.push('- Add a clear call-to-action (e.g. "Call Now", "Book Appointment", "Get a Quote")')
  lines.push('- Use a colour palette that fits the business type')
  lines.push('- Smooth scroll navigation')
  lines.push('')
  lines.push('Build the complete HTML file now.')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Prompt section (inline, replaces PromptTab)
// ---------------------------------------------------------------------------
function PromptSection({ business }: { business: Business }) {
  const updatePrompt = useUpdateWebsitePrompt()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (editing) setDraft(business.websitePrompt ?? '')
  }, [editing])

  const handleGenerate = async () => {
    const prompt = buildPrompt(business)
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: prompt })
    setShowPrompt(true)
  }

  const handleSave = async () => {
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: draft })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = async () => {
    if (!confirm('Delete the saved prompt?')) return
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: null })
    setEditing(false)
    setShowPrompt(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(business.websitePrompt ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Website Prompt</h3>
        <div className="flex items-center gap-2">
          {!business.websitePrompt ? (
            <button
              onClick={handleGenerate}
              disabled={updatePrompt.isPending}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {updatePrompt.isPending ? 'Generating…' : 'Generate Prompt'}
            </button>
          ) : (
            <>
              {saved && <span className="text-xs text-green-600">✓ Saved</span>}
              <button onClick={handleCopy} className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => setShowPrompt(s => !s)} className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                {showPrompt ? 'Hide' : 'Show'}
              </button>
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={updatePrompt.isPending} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {updatePrompt.isPending ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditing(true); setShowPrompt(true) }} className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors">Edit</button>
                  <button onClick={handleReset} disabled={updatePrompt.isPending} className="text-xs text-red-400 hover:text-red-600 border border-gray-200 px-2 py-1 rounded-lg transition-colors">Delete</button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!business.websitePrompt && (
        <p className="text-xs text-gray-400">
          Generate a structured prompt from all available data — use it in any AI tool to build the website manually.
        </p>
      )}

      {business.websitePrompt && showPrompt && (
        editing ? (
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full h-[400px] font-mono text-xs text-gray-800 bg-gray-50 border border-blue-400 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"
          />
        ) : (
          <pre className="w-full font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[400px]">
            {business.websitePrompt}
          </pre>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// WebsiteTab
// ---------------------------------------------------------------------------
export function WebsiteTab({ business, onGenerate, generating }: { business: any; onGenerate: () => void; generating: boolean }) {
  const [showCode, setShowCode] = useState(false)

  return (
    <div className="space-y-8">
      {/* ── Current Website Structure ── */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Current Website Structure</h3>
        <WebsiteAnalysisSection business={business} />
      </div>

      <div className="border-t border-gray-200" />

      {/* ── Prompt ── */}
      <PromptSection business={business} />

      <div className="border-t border-gray-200" />

      {/* ── Generated Website ── */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Generated Website</h3>
        {!business.generatedWebsiteCode ? (
          <div className="text-center py-10">
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
        ) : (
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
        )}
      </div>
    </div>
  )
}
