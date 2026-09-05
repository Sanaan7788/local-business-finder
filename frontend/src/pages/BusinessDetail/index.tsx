import { useParams, useSearchParams } from 'react-router-dom'
import { useBusiness } from '../../hooks/useBusinesses'
import { cn } from '../../lib/cn'
import { formatNumber } from '../../lib/format'
import { TONE } from '../../lib/tones'
import { LeadStatusBadge, PriorityBadge } from '../../components/business/LeadBadges'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/Heading'
import { LoadingBlock } from '../../components/ui/Spinner'
import { Tabs } from '../../components/ui/Tabs'
import { OverviewTab } from './tabs/OverviewTab'
import { AIAnalysisTab } from './tabs/AIAnalysisTab'
import { ContentBriefTab } from './tabs/ContentBriefTab'
import { WebsiteTab } from './tabs/WebsiteTab'
import { CRMTab } from './tabs/CRMTab'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'analysis', label: 'AI Analysis' },
  { key: 'brief', label: 'Content Brief' },
  { key: 'website', label: 'Website' },
  { key: 'crm', label: 'CRM' },
] as const

type TabKey = (typeof TABS)[number]['key']
const isTabKey = (v: string | null): v is TabKey => TABS.some(t => t.key === v)

export default function BusinessDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const { data: business, isPending, isError, error, refetch } = useBusiness(id)

  const tabParam = params.get('tab')
  const tab: TabKey = isTabKey(tabParam) ? tabParam : 'overview'
  const setTab = (next: TabKey) =>
    setParams(prev => {
      const p = new URLSearchParams(prev)
      if (next === 'overview') p.delete('tab')
      else p.set('tab', next)
      return p
    }, { replace: true })

  if (isPending) return <LoadingBlock />
  if (isError || !business) {
    return <ErrorState error={error} message="Business not found." onRetry={() => void refetch()} />
  }

  const hasData: Record<TabKey, boolean> = {
    overview: false,
    analysis: Boolean(business.summary || business.keywords.length > 0 || business.insights),
    brief: Boolean(business.contentBrief),
    website: Boolean(business.generatedWebsiteCode),
    crm: false,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={-1}
        title={business.name}
        description={business.address || <span className="italic">No address — click Edit to add</span>}
        actions={
          <>
            <PriorityBadge priority={business.priority} score={business.priorityScore} />
            <LeadStatusBadge status={business.leadStatus} />
            {business.tokensUsed > 0 && <Badge tone="purple">{formatNumber(business.tokensUsed)} tokens</Badge>}
          </>
        }
      />

      <Tabs
        aria-label="Business sections"
        value={tab}
        onChange={setTab}
        items={TABS.map(t => ({
          key: t.key,
          label: t.label,
          badge: hasData[t.key] ? <span aria-label="has data" className={cn('inline-block h-1.5 w-1.5 rounded-full', TONE.success.dot)} /> : undefined,
        }))}
      />

      <Card className="p-6">
        {tab === 'overview' && <OverviewTab business={business} />}
        {tab === 'analysis' && <AIAnalysisTab business={business} />}
        {tab === 'brief' && <ContentBriefTab business={business} />}
        {tab === 'website' && <WebsiteTab business={business} />}
        {tab === 'crm' && <CRMTab business={business} />}
      </Card>
    </div>
  )
}
