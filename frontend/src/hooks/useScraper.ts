import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scraperApi } from '../lib/api'
import type { LookupResult, ScraperStatus } from '../types/scraper'
import { qk } from './queryKeys'

// ---------------------------------------------------------------------------
// Status — polls only while a scrape is running. The start mutation flips
// `running` in the cache immediately so polling engages without waiting.
// ---------------------------------------------------------------------------

export function useScraperStatus() {
  return useQuery({
    queryKey: qk.scraper.status(),
    queryFn: scraperApi.status,
    staleTime: 15_000,
    refetchInterval: query => (query.state.data?.running ? 2500 : false),
  })
}

/**
 * Watches the status query and, when a scrape goes from running to finished,
 * refreshes everything the scrape changed. Mount once (in the layout) so the
 * transition is observed on any page.
 */
export function useScraperCompletionSync() {
  const qc = useQueryClient()
  const { data } = useScraperStatus()
  const running = data?.running
  const prev = useRef(running)

  useEffect(() => {
    if (prev.current === true && running === false) {
      for (const queryKey of [
        qk.businesses.lists(),
        qk.businesses.stats(),
        qk.businesses.categories(),
        qk.scraper.history(),
        qk.settings.tokens(),
      ]) {
        qc.invalidateQueries({ queryKey })
      }
    }
    prev.current = running
  }, [running, qc])
}

export function useScrapeHistory() {
  return useQuery({ queryKey: qk.scraper.history(), queryFn: scraperApi.history })
}

export function useScrapeSession(id: string | null) {
  return useQuery({
    queryKey: qk.scraper.session(id ?? ''),
    queryFn: () => scraperApi.historyById(id!),
    enabled: Boolean(id),
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function useStartMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.setQueryData<ScraperStatus>(qk.scraper.status(), prev => prev && { ...prev, running: true })
      qc.invalidateQueries({ queryKey: qk.scraper.status() })
    },
  })
}

export function useStartScraper() {
  return useStartMutation(({ zipcode, category, maxResults }: { zipcode: string; category: string; maxResults: number }) =>
    scraperApi.start(zipcode, category, maxResults),
  )
}

export function useStartBatch() {
  return useStartMutation(({ zipcode, categories, maxResults }: { zipcode: string; categories: string[]; maxResults: number }) =>
    scraperApi.startBatch(zipcode, categories, maxResults),
  )
}

export function useStopScraper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: scraperApi.stop,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scraper.status() }),
  })
}

function useImportMutation(mutationFn: (input: string) => Promise<LookupResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of [qk.businesses.lists(), qk.businesses.stats(), qk.businesses.categories(), qk.settings.tokens()]) {
        qc.invalidateQueries({ queryKey })
      }
    },
  })
}

export function useLookupByMapsUrl() {
  return useImportMutation(scraperApi.lookupByMapsUrl)
}

export function useImportFromUrl() {
  return useImportMutation(scraperApi.importFromUrl)
}
