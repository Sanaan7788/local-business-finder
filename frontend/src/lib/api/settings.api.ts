import type { LlmSettings, TokenStats } from '../../types/api'
import { api } from './client'

export const settingsApi = {
  getLlm: () => api.get<LlmSettings>('/settings/llm'),
  setLlm: (provider: string) => api.post<{ active: string }>('/settings/llm', { provider }),
  getStats: () => api.get<TokenStats>('/settings/stats'),
}
