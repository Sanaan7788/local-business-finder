import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi, scraperApi, type BusinessListParams } from '../lib/api'
import type { LeadStatus } from '../types/business'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const keys = {
  businesses: (params: BusinessListParams) => ['businesses', params] as const,
  business: (id: string) => ['business', id] as const,
  stats: () => ['businesses', 'stats'] as const,
  scraper: () => ['scraper', 'status'] as const,
}

// ---------------------------------------------------------------------------
// Businesses list
// ---------------------------------------------------------------------------
export function useBusinesses(params: BusinessListParams = {}) {
  return useQuery({
    queryKey: keys.businesses(params),
    queryFn: () => businessApi.list(params),
  })
}

// ---------------------------------------------------------------------------
// Single business
// ---------------------------------------------------------------------------
export function useBusiness(id: string) {
  return useQuery({
    queryKey: keys.business(id),
    queryFn: () => businessApi.get(id),
    enabled: Boolean(id),
  })
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
export function useBusinessStats() {
  return useQuery({
    queryKey: keys.stats(),
    queryFn: () => businessApi.stats(),
    refetchInterval: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Scraper status — polls every 3s while running
// ---------------------------------------------------------------------------
export function useScraperStatus() {
  return useQuery({
    queryKey: keys.scraper(),
    queryFn: () => scraperApi.status(),
    refetchInterval: (query) => (query.state.data?.running ? 3000 : 10_000),
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export function useCreateBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof businessApi.create>[0]) => businessApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof businessApi.updateProfile>[1] }) =>
      businessApi.updateProfile(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(keys.business(updated.id), updated)
      qc.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      businessApi.updateStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData(keys.business(updated.id), updated)
      qc.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useUpdateNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string | null }) =>
      businessApi.updateNotes(id, notes),
    onSuccess: (updated) => {
      qc.setQueryData(keys.business(updated.id), updated)
    },
  })
}

export function useAnalyze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.analyze(id),
    onSuccess: (updated) => {
      qc.setQueryData(keys.business(updated.id), updated)
      qc.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useGenerateContentBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.generateContentBrief(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.business(id) })
    },
  })
}

export function useGenerateWebsite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.generateWebsite(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.business(id) })
    },
  })
}

export function useLookupBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ businessName, location }: { businessName: string; location: string }) =>
      scraperApi.lookup(businessName, location),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useStartScraper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ zipcode, category, maxResults }: { zipcode: string; category: string; maxResults: number }) =>
      scraperApi.start(zipcode, category, maxResults),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.scraper() })
    },
  })
}

export function useStartBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ zipcode, categories, maxResults }: { zipcode: string; categories: string[]; maxResults: number }) =>
      scraperApi.startBatch(zipcode, categories, maxResults),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.scraper() })
    },
  })
}

export function useStopScraper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => scraperApi.stop(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.scraper() })
    },
  })
}

export function useDeleteBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}
