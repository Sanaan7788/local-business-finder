// ---------------------------------------------------------------------------
// Business types — mirror of backend/src/types/business.types.ts.
// ---------------------------------------------------------------------------

export type LeadStatus = 'new' | 'qualified' | 'contacted' | 'interested' | 'closed' | 'rejected'

export type Priority = 'high' | 'medium' | 'low'

export interface Insights {
  whyNeedsWebsite: string
  whatsMissingOnline: string
  opportunities: string[]
}

export interface ContentBrief {
  confirmedFacts: string
  assumptions: string
  generatedAt?: string
}

export interface Keywords {
  serviceKeywords: string[]
  locationKeywords: string[]
  reputationKeywords: string[]
  searchPhrases: string[]
}

export interface OutreachEmail {
  subject: string
  body: string
}

export interface Outreach {
  email: OutreachEmail | null
}

export interface CrawledPage {
  url: string
  title: string
  headings: string[]
  paragraphs: string[]
  navLinks: string[]
  images: number
  hasContactForm: boolean
  hasPhone: boolean
  hasEmail: boolean
  emails: string[]
}

export interface WebsiteAnalysis {
  crawledAt: string
  pagesVisited: number
  rawPages: CrawledPage[]
  structured: string | null
  improvements: string[]
  score: number | null
  scoreReason: string | null
}

export interface MenuItem {
  name: string
  price: string | null
  description: string | null
}

export interface MenuSection {
  section: string
  items: MenuItem[]
}

export interface Business {
  // Identity
  id: string
  createdAt: string
  updatedAt: string

  // Discovery
  name: string
  phone: string | null
  address: string
  zipcode: string
  category: string
  description: string | null
  website: boolean
  websiteUrl: string | null
  rating: number | null
  reviewCount: number | null
  googleMapsUrl: string | null

  // Scraper extras
  reviewSnippets: string[]
  menu: MenuSection[]
  scrapedEmails: string[]

  // AI outputs
  keywords: string[]
  keywordCategories: Keywords | null
  summary: string | null
  businessContext: string | null
  insights: Insights | null
  contentBrief: ContentBrief | null

  // Generated content
  generatedWebsiteCode: string | null
  websitePrompt: string | null
  websiteAnalysis: WebsiteAnalysis | null
  outreach: Outreach | null

  // Token tracking
  tokensUsed: number

  // CRM / Lead
  leadStatus: LeadStatus
  priority: Priority
  priorityScore: number
  notes: string | null
  lastContactedAt: string | null
}

/** The light projection returned by GET /businesses. */
export type BusinessListItem = Pick<
  Business,
  | 'id' | 'createdAt' | 'updatedAt' | 'name' | 'phone' | 'address' | 'zipcode' | 'category'
  | 'website' | 'websiteUrl' | 'rating' | 'reviewCount' | 'leadStatus' | 'priority'
  | 'priorityScore' | 'notes' | 'lastContactedAt' | 'tokensUsed'
>
