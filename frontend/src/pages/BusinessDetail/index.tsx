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

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  )

  if (isError || !business) return (
    <div className="p-12 text-center">
      <p className="text-red-500 mb-4">Business not found.</p>
      <button onClick={() => navigate('/businesses')} className="text-blue-600 hover:underline text-sm">← Back to list</button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{business.name}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
              {business.address || <span className="italic">No address — click Edit to add</span>}
            </p>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap justify-end shrink-0">
            <Badge className={PRIORITY_COLORS[business.priority as Priority]}>{business.priority} priority</Badge>
            <Badge className={LEAD_STATUS_COLORS[business.leadStatus]}>{LEAD_STATUS_LABELS[business.leadStatus]}</Badge>
            {(business.tokensUsed ?? 0) > 0 && (
              <Badge className="bg-purple-100 text-purple-700">{(business.tokensUsed as number).toLocaleString()} tokens</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <nav className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={activeTab !== tab ? { color: 'var(--text-2)' } : {}}
            >
              {tab}
              {tab === 'AI Analysis' && (business.summary || business.keywords?.length > 0 || business.insights) && (
                <span className="ml-1.5 inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
              {tab === 'Content Brief' && business.contentBrief && (
                <span className="ml-1.5 inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
              {tab === 'Website' && business.generatedWebsiteCode && (
                <span className="ml-1.5 inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
              {tab === 'Deployment' && business.deployedUrl && (
                <span className="ml-1.5 inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div
        className="rounded-xl p-6 shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
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
