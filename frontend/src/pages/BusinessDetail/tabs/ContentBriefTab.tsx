import { useState } from 'react'

export function ContentBriefTab({
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
  const brief = business.contentBrief as { confirmedFacts: string; assumptions: string; generatedAt?: string } | null

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const websiteCrawledAt = business.websiteAnalysis?.crawledAt ? new Date(business.websiteAnalysis.crawledAt) : null
  const briefGeneratedAt = brief?.generatedAt ? new Date(brief.generatedAt) : null
  // Show stale banner if website was analyzed after the brief was last generated (or brief has no timestamp)
  const hasWebsiteAnalysis = !!business.websiteAnalysis
  const briefIsStale = hasWebsiteAnalysis && (!briefGeneratedAt || (websiteCrawledAt && websiteCrawledAt > briefGeneratedAt))

  if (!brief) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">No content brief generated yet.</p>
        <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto">
          The content brief describes the business in detail — what it sells, what customers love,
          and reasonable assumptions. It feeds directly into website generation.
        </p>
        {hasWebsiteAnalysis && (
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 max-w-sm mx-auto">
            Website analysis is available — generating now will include the crawled site content in confirmed facts.
          </p>
        )}
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
      {briefIsStale && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
          <span className="text-amber-800">Website was analyzed after this brief was generated — regenerate to include crawled site content in confirmed facts.</span>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="ml-4 shrink-0 text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Regenerating…' : 'Regenerate Now'}
          </button>
        </div>
      )}
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
