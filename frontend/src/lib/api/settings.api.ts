import { api, unwrap } from './client'

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface ProviderInfo {
  id: string
  label: string
  model: string
  configured: boolean
  free?: string
}

export const settingsApi = {
  getLlm: () =>
    api.get<any>('/settings/llm').then(unwrap) as Promise<{ active: string; providers: ProviderInfo[] }>,

  setLlm: (provider: string) =>
    api.post<any>('/settings/llm', { provider }).then(unwrap) as Promise<{ active: string }>,

  getStats: () =>
    api.get<any>('/settings/stats').then(unwrap) as Promise<{ totalTokensUsed: number }>,
}
