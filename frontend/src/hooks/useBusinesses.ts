import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi, type BusinessListParams } from '../lib/api'
import type { LeadStatus } from '../types/business'
import { keys } from './queryKeys'
export { keys } from './queryKeys'

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

export function useAnalyzeWebsite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.analyzeWebsite(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.business(id) })
    },
  })
}

export function useUpdateWebsiteAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { structured?: string; improvements?: string[] } }) =>
      businessApi.updateWebsiteAnalysis(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: keys.business(id) })
    },
  })
}

export function useUpdateWebsitePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, websitePrompt }: { id: string; websitePrompt: string | null }) =>
      businessApi.updateWebsitePrompt(id, websitePrompt),
    onSuccess: (updated) => {
      qc.setQueryData(keys.business(updated.id), updated)
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
