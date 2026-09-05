import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { businessApi } from '../lib/api'
import type { Business, LeadStatus } from '../types/business'
import type { BusinessListParams, CreateBusinessInput, UpdateProfileInput } from '../types/api'
import { qk } from './queryKeys'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useBusinessList(params: BusinessListParams) {
  return useQuery({
    queryKey: qk.businesses.list(params),
    queryFn: () => businessApi.list(params),
    placeholderData: keepPreviousData, // paging/filtering keeps the old rows until the new ones arrive
  })
}

export function useBusiness(id: string) {
  return useQuery({
    queryKey: qk.businesses.detail(id),
    queryFn: () => businessApi.get(id),
    enabled: Boolean(id),
  })
}

export function useBusinessStats() {
  return useQuery({ queryKey: qk.businesses.stats(), queryFn: businessApi.stats, staleTime: 60_000 })
}

export function useBusinessCategories() {
  return useQuery({ queryKey: qk.businesses.categories(), queryFn: businessApi.categories, staleTime: 5 * 60_000 })
}

// ---------------------------------------------------------------------------
// Mutations. When a call returns the full Business it is written straight into
// the detail cache; partial responses invalidate the detail instead.
// ---------------------------------------------------------------------------

const setDetail = (qc: QueryClient, business: Business) => qc.setQueryData(qk.businesses.detail(business.id), business)
const invalidate = (qc: QueryClient, ...keys: readonly (readonly string[])[]) =>
  keys.forEach(queryKey => qc.invalidateQueries({ queryKey }))

export function useCreateBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBusinessInput) => businessApi.create(data),
    onSuccess: business => {
      setDetail(qc, business)
      invalidate(qc, qk.businesses.lists(), qk.businesses.stats(), qk.businesses.categories())
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileInput }) => businessApi.updateProfile(id, data),
    onSuccess: business => {
      setDetail(qc, business)
      invalidate(qc, qk.businesses.lists(), qk.businesses.stats(), qk.businesses.categories())
    },
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => businessApi.updateStatus(id, status),
    onSuccess: business => {
      setDetail(qc, business)
      invalidate(qc, qk.businesses.lists(), qk.businesses.stats())
    },
  })
}

export function useUpdateNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string | null }) => businessApi.updateNotes(id, notes),
    onSuccess: business => {
      setDetail(qc, business)
      invalidate(qc, qk.businesses.lists()) // the list flags "Scrape error" notes
    },
  })
}

export function useAnalyze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.analyze(id),
    onSuccess: business => {
      setDetail(qc, business)
      invalidate(qc, qk.businesses.lists(), qk.settings.tokens())
    },
  })
}

export function useGenerateContentBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.generateContentBrief(id),
    onSuccess: (_data, id) => invalidate(qc, qk.businesses.detail(id), qk.settings.tokens()),
  })
}

export function useGenerateWebsitePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.generateWebsitePrompt(id),
    onSuccess: business => setDetail(qc, business),
  })
}

export function useUpdateWebsitePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, websitePrompt }: { id: string; websitePrompt: string | null }) =>
      businessApi.updateWebsitePrompt(id, websitePrompt),
    onSuccess: business => setDetail(qc, business),
  })
}

export function useGenerateWebsite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.generateWebsite(id),
    onSuccess: (_data, id) => invalidate(qc, qk.businesses.detail(id), qk.settings.tokens()),
  })
}

export function useAnalyzeWebsite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.analyzeWebsite(id),
    onSuccess: (_data, id) => invalidate(qc, qk.businesses.detail(id), qk.settings.tokens()),
  })
}

export function useUpdateWebsiteAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { structured?: string; improvements?: string[] } }) =>
      businessApi.updateWebsiteAnalysis(id, data),
    onSuccess: (_data, { id }) => invalidate(qc, qk.businesses.detail(id)),
  })
}

export function useGenerateOutreachEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.generateOutreachEmail(id),
    onSuccess: (_data, id) => invalidate(qc, qk.businesses.detail(id), qk.settings.tokens()),
  })
}

export function useMenuFromImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => businessApi.menuFromImages(id, files),
    onSuccess: (_data, { id }) => invalidate(qc, qk.businesses.detail(id), qk.settings.tokens()),
  })
}

export function useRescrape() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.rescrape(id),
    onSuccess: business => {
      setDetail(qc, business)
      invalidate(qc, qk.businesses.lists(), qk.businesses.stats(), qk.settings.tokens())
    },
  })
}

export function useDeleteBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessApi.delete(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.businesses.detail(id) })
      invalidate(qc, qk.businesses.lists(), qk.businesses.stats(), qk.businesses.categories())
    },
  })
}
