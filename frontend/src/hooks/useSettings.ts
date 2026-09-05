import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../lib/api'
import type { LlmSettings } from '../types/api'
import { qk } from './queryKeys'

export const LLM_PROVIDER_STORAGE_KEY = 'llm_provider'

export function useLlmSettings() {
  return useQuery({ queryKey: qk.settings.llm(), queryFn: settingsApi.getLlm, staleTime: Infinity })
}

export function useSetLlmProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) => settingsApi.setLlm(provider),
    onSuccess: ({ active }) => {
      qc.setQueryData<LlmSettings>(qk.settings.llm(), prev => prev && { ...prev, active })
      try {
        localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, active)
      } catch {
        // storage unavailable
      }
    },
  })
}

export function useTokenStats() {
  return useQuery({ queryKey: qk.settings.tokens(), queryFn: settingsApi.getStats, staleTime: 60_000 })
}
