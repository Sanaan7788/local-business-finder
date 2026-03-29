export function SummaryTab({ business, onAnalyze, analyzing }: { business: any; onAnalyze: () => void; analyzing: boolean }) {
  if (!business.summary && !business.businessContext) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No summary generated yet.</p>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {analyzing ? 'Analyzing…' : 'Generate AI Analysis'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Generates keywords, summary, business context, and insights in one go</p>
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
  )
}
