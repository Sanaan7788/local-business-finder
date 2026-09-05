import type { BusinessApi } from '../business.api'
import type { Business, BusinessListItem, LeadStatus } from '../../../types/business'
import type { BusinessListParams } from '../../../types/api'
import { ApiError } from '../api-error'
import { LEAD_STATUS_TRANSITIONS } from '../../leads'
import { snapshot } from './store'
import { applyChange, readChanges, setChange } from './overlay'
import { applyListParams, computeCategories, computeStats } from './query'
import { notAvailable } from './not-available'

// ---------------------------------------------------------------------------
// businessApi for the static build: reads = snapshot + local overlay,
// status/notes = overlay only, everything else needs the backend.
// ---------------------------------------------------------------------------

async function listItems(): Promise<BusinessListItem[]> {
  const { items } = await snapshot.index()
  const changes = readChanges()
  return items.map(b => applyChange(b, changes[b.id]))
}

async function getBusiness(id: string): Promise<Business> {
  const business = await snapshot.business(id)
  return applyChange(business, readChanges()[id])
}

export const staticBusinessApi = {
  list: (params: BusinessListParams = {}) => listItems().then(items => applyListParams(items, params)),
  categories: () => listItems().then(computeCategories),
  stats: () => listItems().then(computeStats),
  get: getBusiness,

  create: notAvailable,
  updateProfile: notAvailable,
  updateStatus: async (id: string, status: LeadStatus) => {
    const business = await getBusiness(id)
    const allowed = LEAD_STATUS_TRANSITIONS[business.leadStatus]
    if (!allowed.includes(status)) {
      // Same rule and wording as LeadService.updateStatus on the backend
      throw new ApiError(`Invalid transition: ${business.leadStatus} → ${status}. Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`, 422)
    }
    const patch = status === 'contacted' ? { leadStatus: status, lastContactedAt: new Date().toISOString() } : { leadStatus: status }
    setChange(id, patch, { leadStatus: business.leadStatus })
    return getBusiness(id)
  },
  updateNotes: async (id: string, notes: string | null) => {
    const business = await getBusiness(id)
    setChange(id, { notes }, { leadStatus: business.leadStatus })
    return getBusiness(id)
  },
  updateWebsitePrompt: notAvailable,
  delete: notAvailable,

  analyze: notAvailable,
  generateContentBrief: notAvailable,
  generateWebsitePrompt: notAvailable,
  generateWebsite: notAvailable,
  analyzeWebsite: notAvailable,
  updateWebsiteAnalysis: notAvailable,
  generateOutreachEmail: notAvailable,
  rescrape: notAvailable,
  menuFromImages: notAvailable,
} satisfies BusinessApi
