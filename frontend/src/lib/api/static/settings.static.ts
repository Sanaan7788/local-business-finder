import type { SettingsApi } from '../settings.api'
import type { TokenStats } from '../../../types/api'
import { snapshot } from './store'
import { notAvailable } from './not-available'

/** settingsApi for the static build: the token total is frozen at export time. */
export const staticSettingsApi = {
  getLlm: notAvailable,
  setLlm: notAvailable,
  getStats: async (): Promise<TokenStats> => ({ totalTokensUsed: (await snapshot.index()).meta.totalTokensUsed }),
} satisfies SettingsApi
