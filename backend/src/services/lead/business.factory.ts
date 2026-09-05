import { v4 as uuidv4 } from 'uuid';
import { Business, RawBusiness } from '../../types/business.types';
import { scoreLead } from './lead.scorer';

type Extras = Partial<Pick<Business, 'reviewSnippets' | 'menu' | 'notes' | 'googleMapsUrl'>>;

/**
 * Build a complete Business record from raw scraped/entered data:
 * id, timestamps, lead score and every empty AI/CRM default.
 * The single place a new Business is shaped.
 */
export function buildBusiness(raw: RawBusiness, extras: Extras = {}): Business {
  const { score, priority } = scoreLead(raw);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...raw,
    googleMapsUrl: extras.googleMapsUrl ?? raw.googleMapsUrl,

    reviewSnippets: extras.reviewSnippets ?? [],
    menu: extras.menu ?? [],
    scrapedEmails: [],

    keywords: [],
    keywordCategories: null,
    summary: null,
    businessContext: null,
    insights: null,
    contentBrief: null,

    generatedWebsiteCode: null,
    websitePrompt: null,
    websiteAnalysis: null,
    outreach: null,

    tokensUsed: 0,

    leadStatus: 'new',
    priority,
    priorityScore: score,
    notes: extras.notes ?? null,
    lastContactedAt: null,
  };
}
