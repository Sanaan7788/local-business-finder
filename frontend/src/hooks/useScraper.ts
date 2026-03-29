import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scraperApi } from '../lib/api'
import { keys } from './queryKeys'

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
