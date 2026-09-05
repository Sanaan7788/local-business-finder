import { SectionHeading } from '../../../components/ui/Heading'
import type { Business } from '../../../types/business'
import { WebsiteAnalysisSection } from '../components/WebsiteAnalysisSection'
import { WebsitePromptSection } from '../website/WebsitePromptSection'
import { GeneratedWebsiteSection } from '../website/GeneratedWebsiteSection'

export function WebsiteTab({ business }: { business: Business }) {
  return (
    <div className="space-y-8">
      {business.websiteAnalysis || !business.websiteUrl ? null : <SectionHeading title="Current Website" className="-mb-4" />}
      <WebsiteAnalysisSection business={business} />
      <hr className="border-line" />
      <WebsitePromptSection business={business} />
      <hr className="border-line" />
      <GeneratedWebsiteSection business={business} />
    </div>
  )
}
