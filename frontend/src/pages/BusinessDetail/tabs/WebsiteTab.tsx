import { useState } from 'react'
import { WebsiteAnalysisSection } from '../components/WebsiteAnalysisSection'
import { CopyButton } from '../../../components/ui/CopyButton'

export function WebsiteTab({ business, onGenerate, generating }: { business: any; onGenerate: () => void; generating: boolean }) {
  const [showCode, setShowCode] = useState(false)

  return (
    <div className="space-y-8">
      {/* ── Current Website Structure ── */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Current Website Structure</h3>
        <WebsiteAnalysisSection business={business} />
      </div>

      {/* ── Divider ── */}
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
