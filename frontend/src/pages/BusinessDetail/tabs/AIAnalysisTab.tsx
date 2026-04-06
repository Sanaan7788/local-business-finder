import { useState } from 'react'

const KEYWORD_GROUPS = [
  { key: 'serviceKeywords',    label: 'Services',       color: 'bg-blue-50 border-blue-200 text-blue-800',      dot: 'bg-blue-400' },
  { key: 'locationKeywords',   label: 'Location',       color: 'bg-green-50 border-green-200 text-green-800',   dot: 'bg-green-400' },
  { key: 'reputationKeywords', label: 'Reputation',     color: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-400' },
  { key: 'searchPhrases',      label: 'Search Phrases', color: 'bg-orange-50 border-orange-200 text-orange-800', dot: 'bg-orange-400' },
] as const

export function AIAnalysisTab({ business, onAnalyze, analyzing }: { business: any; onAnalyze: () => void; analyzing: boolean }) {
  const [copiedKeywords, setCopiedKeywords] = useState(false)
  const keywords: string[] = business.keywords ?? []
  const cats = business.keywordCategories as Record<string, string[]> | null
  const hasAnyData = business.summary || business.businessContext || keywords.length > 0 || business.insights

  const copyAllKeywords = () => {
    navigator.clipboard.writeText(keywords.join(', '))
    setCopiedKeywords(true)
    setTimeout(() => setCopiedKeywords(false), 2000)
  }

  if (!hasAnyData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2 font-medium">No AI analysis yet.</p>
        <p className="text-xs text-gray-400 mb-6">Generates keywords, summary, business context, and insights in one go.</p>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {analyzing ? 'Analyzing… (may take 2–3 min)' : 'Generate AI Analysis'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={onAnalyze} disabled={analyzing} className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50">
          {analyzing ? 'Re-analyzing…' : 'Re-analyze'}
        </button>
      </div>

      {/* ── Summary ── */}
      {(business.summary || business.businessContext) && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</p>
          {business.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Business Summary</p>
              <p className="text-sm text-blue-900 leading-relaxed">{business.summary}</p>
            </div>
          )}
          {business.businessContext && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Industry & Category Context</p>
              <pre className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {business.businessContext}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Keywords ── */}
      {keywords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keywords</p>
            <button
              onClick={copyAllKeywords}
              className="text-xs border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copiedKeywords ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          {cats ? (
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
                        <span key={k} className={`border px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{k}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k: string) => (
                <span key={k} className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">{k}</span>
              ))}
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1 font-medium">All keywords — comma-separated</p>
            <p className="text-xs text-gray-700 font-mono leading-relaxed break-words">{keywords.join(', ')}</p>
          </div>
        </div>
      )}

      {/* ── Insights ── */}
      {business.insights && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Insights</p>
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
      )}
    </div>
  )
}
