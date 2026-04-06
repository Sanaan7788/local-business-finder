import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useBusiness,
  useAnalyze,
  useGenerateContentBrief,
  useGenerateWebsite,
} from '../../hooks/useBusinesses'
import { Badge } from '../../components/ui/Badge'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PRIORITY_COLORS } from '../../types/business'
import type { Priority } from '../../types/business'
import { OverviewTab } from './tabs/OverviewTab'
import { AIAnalysisTab } from './tabs/AIAnalysisTab'
import { ContentBriefTab } from './tabs/ContentBriefTab'
import { WebsiteTab } from './tabs/WebsiteTab'
import { CRMTab } from './tabs/CRMTab'
import { DeploymentTab } from './tabs/DeploymentTab'

const TABS = ['Overview', 'AI Analysis', 'Content Brief', 'Website', 'CRM', 'Deployment'] as const
type Tab = typeof TABS[number]

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: business, isLoading, isError } = useBusiness(id!)
  const analyze = useAnalyze()
  const generateContentBrief = useGenerateContentBrief()
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
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{business.address || <span className="italic">No address — click Edit to add</span>}</p>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap justify-end">
            <Badge className={PRIORITY_COLORS[business.priority as Priority]}>{business.priority} priority</Badge>
            <Badge className={LEAD_STATUS_COLORS[business.leadStatus]}>{LEAD_STATUS_LABELS[business.leadStatus]}</Badge>
            {(business.tokensUsed ?? 0) > 0 && (
              <Badge className="bg-purple-100 text-purple-700">{(business.tokensUsed as number).toLocaleString()} tokens</Badge>
            )}
          </div>
        </div>
      </div>

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
              {tab === 'AI Analysis' && (business.summary || business.keywords?.length > 0 || business.insights) && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Content Brief' && business.contentBrief && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Website' && business.generatedWebsiteCode && <span className="ml-1 text-xs text-green-500">✓</span>}
              {tab === 'Deployment' && business.deployedUrl && <span className="ml-1 text-xs text-green-500">✓</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'Overview' && <OverviewTab business={business} />}
        {activeTab === 'AI Analysis' && (
          <AIAnalysisTab business={business} onAnalyze={() => analyze.mutate(id!)} analyzing={analyze.isPending} />
        )}
        {activeTab === 'Content Brief' && (
          <ContentBriefTab
            business={business}
            onGenerate={() => generateContentBrief.mutate(id!)}
            generating={generateContentBrief.isPending}
          />
        )}
        {activeTab === 'Website' && (
          <WebsiteTab business={business} onGenerate={() => generateWebsite.mutate(id!)} generating={generateWebsite.isPending} />
        )}
        {activeTab === 'CRM' && <CRMTab business={business} />}
        {activeTab === 'Deployment' && <DeploymentTab business={business} />}
      </div>
    </div>
  )
}
