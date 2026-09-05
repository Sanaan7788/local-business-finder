import { useState } from 'react'
import type { Business } from '../../../types/business'
import type { UpdateProfileInput } from '../../../types/api'

export interface ProfileDraft {
  name: string
  phone: string
  address: string
  zipcode: string
  category: string
  description: string
  website: boolean
  websiteUrl: string
  rating: string
  reviewCount: string
  googleMapsUrl: string
}

const draftFromBusiness = (b: Business): ProfileDraft => ({
  name: b.name,
  phone: b.phone ?? '',
  address: b.address,
  zipcode: b.zipcode,
  category: b.category,
  description: b.description ?? '',
  website: b.website,
  websiteUrl: b.websiteUrl ?? '',
  rating: b.rating === null ? '' : String(b.rating),
  reviewCount: b.reviewCount === null ? '' : String(b.reviewCount),
  googleMapsUrl: b.googleMapsUrl ?? '',
})

/** Local edit buffer for the Overview form. */
export function useProfileDraft(business: Business) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromBusiness(business))

  const setField = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const startEdit = () => setDraft(draftFromBusiness(business))

  const toPayload = (): UpdateProfileInput => ({
    name: draft.name || undefined,
    phone: draft.phone || null,
    address: draft.address || undefined,
    zipcode: draft.zipcode || undefined,
    category: draft.category || undefined,
    description: draft.description || null,
    website: draft.website,
    websiteUrl: draft.websiteUrl || null,
    rating: draft.rating !== '' ? Number(draft.rating) : null,
    reviewCount: draft.reviewCount !== '' ? Number(draft.reviewCount) : null,
    googleMapsUrl: draft.googleMapsUrl || null,
  })

  return { draft, setField, startEdit, toPayload }
}
