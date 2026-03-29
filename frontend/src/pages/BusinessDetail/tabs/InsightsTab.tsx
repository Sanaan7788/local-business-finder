export function InsightsTab({ business, onAnalyze, analyzing }: { business: any; onAnalyze: () => void; analyzing: boolean }) {
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
