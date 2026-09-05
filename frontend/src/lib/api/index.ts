import { businessApi as liveBusinessApi, type BusinessApi } from './business.api'
import { scraperApi as liveScraperApi, type ScraperApi } from './scraper.api'
import { settingsApi as liveSettingsApi, type SettingsApi } from './settings.api'
import { staticBusinessApi } from './static/business.static'
import { staticScraperApi } from './static/scraper.static'
import { staticSettingsApi } from './static/settings.static'

export { ApiError } from './api-error'

// The static (GitHub Pages) build reads a JSON snapshot plus a localStorage
// overlay instead of the backend. The mode check is written inline rather than
// through IS_STATIC from lib/env: the bundler folds import.meta.env.MODE within
// a module, which is what lets it drop the unused implementation (and axios)
// from the module graph instead of only minifying dead branches.
export const businessApi: BusinessApi = import.meta.env.MODE === 'static' ? staticBusinessApi : liveBusinessApi
export const scraperApi: ScraperApi = import.meta.env.MODE === 'static' ? staticScraperApi : liveScraperApi
export const settingsApi: SettingsApi = import.meta.env.MODE === 'static' ? staticSettingsApi : liveSettingsApi
