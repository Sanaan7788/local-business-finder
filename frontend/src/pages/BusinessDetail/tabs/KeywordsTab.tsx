import { useState } from 'react'

const KEYWORD_GROUPS = [
  { key: 'serviceKeywords',    label: 'Services',    color: 'bg-blue-50 border-blue-200 text-blue-800',    dot: 'bg-blue-400' },
  { key: 'locationKeywords',   label: 'Location',    color: 'bg-green-50 border-green-200 text-green-800',  dot: 'bg-green-400' },
  { key: 'reputationKeywords', label: 'Reputation',  color: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-400' },
  { key: 'searchPhrases',      label: 'Search Phrases', color: 'bg-orange-50 border-orange-200 text-orange-800', dot: 'bg-orange-400' },
] as const

export function KeywordsTab({ business, onAnalyze, analyzing }: { business: any; onAnalyze: () => void; analyzing: boolean }) {
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
