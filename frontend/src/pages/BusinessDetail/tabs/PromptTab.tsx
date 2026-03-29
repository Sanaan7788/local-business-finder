import { useState, useEffect } from 'react'
import { useUpdateWebsitePrompt } from '../../../hooks/useBusinesses'
import type { Business } from '../../../types/business'

// ---------------------------------------------------------------------------
// Build the default prompt from all available business data
// ---------------------------------------------------------------------------
function buildPrompt(business: Business): string {
  const lines: string[] = []

  lines.push('You are a professional web developer. Build a complete, modern, single-page website for the following local business.')
  lines.push('Return only the complete HTML file — no explanation, no markdown, no code fences. The file must be self-contained (inline CSS and JS, no external dependencies).')
  lines.push('')

  // --- Business basics ---
  lines.push('== BUSINESS INFORMATION ==')
  lines.push(`Name: ${business.name}`)
  lines.push(`Category: ${business.category}`)
  if (business.address)  lines.push(`Address: ${business.address}`)
  if (business.phone)    lines.push(`Phone: ${business.phone}`)
  if (business.websiteUrl) lines.push(`Current Website: ${business.websiteUrl}`)
  if (business.rating !== null) {
    lines.push(`Google Rating: ${business.rating}★ (${business.reviewCount ?? 0} reviews)`)
  }
  if (business.googleMapsUrl) lines.push(`Google Maps: ${business.googleMapsUrl}`)
  lines.push('')

  // --- Summary ---
  if (business.summary) {
    lines.push('== BUSINESS SUMMARY ==')
    lines.push(business.summary)
    lines.push('')
  }

  // --- Content brief ---
  if (business.contentBrief) {
    lines.push('== CONFIRMED FACTS (use these as real content) ==')
    lines.push(business.contentBrief.confirmedFacts)
    lines.push('')
    lines.push('== INTELLIGENT ASSUMPTIONS (fill gaps with these) ==')
    lines.push(business.contentBrief.assumptions)
    lines.push('')
  }

  // --- Keywords ---
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

  // --- Insights ---
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

  // --- Website analysis (existing site) ---
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

  // --- Customer reviews ---
  if (business.reviewSnippets?.length > 0) {
    lines.push('== REAL CUSTOMER REVIEWS (use quotes in testimonial section) ==')
    business.reviewSnippets.slice(0, 5).forEach(r => lines.push(`  "${r}"`))
    lines.push('')
  }

  // --- Design instructions ---
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
// PromptTab
// ---------------------------------------------------------------------------
export function PromptTab({ business }: { business: Business }) {
  const updatePrompt = useUpdateWebsitePrompt()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  // The active prompt: saved value takes priority, otherwise auto-build
  const autoPrompt = buildPrompt(business)
  const activePrompt = business.websitePrompt ?? autoPrompt

  // Seed draft when entering edit mode
  useEffect(() => {
    if (editing) setDraft(activePrompt)
  }, [editing])

  const handleSave = async () => {
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: draft })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = async () => {
    if (!confirm('Reset to auto-generated prompt? Your edits will be lost.')) return
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: null })
    setEditing(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activePrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Website Generation Prompt</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-built from all available data. Copy into any AI to generate the website, or edit it to customise.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {business.websitePrompt && (
            <button
              onClick={handleReset}
              disabled={updatePrompt.isPending}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updatePrompt.isPending}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {updatePrompt.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {saved && (
        <p className="text-xs text-green-600 font-medium">✓ Prompt saved</p>
      )}

      {business.websitePrompt && !editing && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          ✏ This prompt has been manually edited. Click Reset to restore the auto-generated version.
        </p>
      )}

      {/* Prompt display or editor */}
      {editing ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-full h-[600px] font-mono text-xs text-gray-800 bg-gray-50 border border-blue-400 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"
        />
      ) : (
        <pre className="w-full font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[600px]">
          {activePrompt}
        </pre>
      )}

      {/* Data coverage badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-xs text-gray-500">Data included:</span>
        {business.summary && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Summary</span>}
        {business.contentBrief && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Content Brief</span>}
        {business.keywords?.length > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Keywords</span>}
        {business.insights && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Insights</span>}
        {business.websiteAnalysis && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Website Analysis</span>}
        {business.reviewSnippets?.length > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Reviews ({business.reviewSnippets.length})</span>}
        {!business.summary && !business.contentBrief && !business.insights && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Run AI Analysis for richer prompt</span>
        )}
      </div>
    </div>
  )
}
