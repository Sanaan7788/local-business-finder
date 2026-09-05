import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Scraper config — conservative pacing to avoid IP blocks and CAPTCHAs.
// ---------------------------------------------------------------------------

export const SCRAPER_CONFIG = {
  headless: !config.scraper.debug,  // SCRAPER_DEBUG=true opens a visible window
  minDelayMs: 2000,                 // Min pause between page actions
  maxDelayMs: 5000,                 // Max pause (randomized within range)
  navigationTimeoutMs: 30_000,      // Max time to wait for page load
  maxRetries: 3,                    // Retry attempts on transient failure
  backoffBaseMs: 2000,              // Base delay for exponential backoff
  viewport: { width: 1280, height: 800 },
  // Realistic user agent — avoids basic bot detection
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/121.0.0.0 Safari/537.36',
};

export const CHROMIUM_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled', // reduce bot signal
  '--disable-infobars',
];

// Heavy assets that never affect text extraction. Stylesheets stay — Google
// Maps needs CSS to render the search box and results.
export const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

const noop = () => undefined;

// ---------------------------------------------------------------------------
// BrowserManager
//
// One Browser + one BrowserContext, shared by every scraper flow. The instance
// itself lives for the process; launch() and close() only manage the browser,
// so callers holding a reference across a stop() see the same object.
//
//   const bm = BrowserManager.getInstance();
//   const page = await bm.newPage();   // launches on demand
//   ...
//   await page.close();
//   await bm.close();                  // when the scraping flow is done
// ---------------------------------------------------------------------------

export class BrowserManager {
  private static _instance: BrowserManager | null = null;

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private launching: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): BrowserManager {
    return (BrowserManager._instance ??= new BrowserManager());
  }

  /** Idempotent; concurrent callers share one launch. */
  async launch(): Promise<void> {
    if (this.browser) return;
    this.launching ??= this.doLaunch().finally(() => { this.launching = null; });
    return this.launching;
  }

  private async doLaunch(): Promise<void> {
    logger.info('BrowserManager: launching Chromium');

    const browser = await chromium.launch({
      headless: SCRAPER_CONFIG.headless,
      args: CHROMIUM_LAUNCH_ARGS,
    });

    const context = await browser.newContext({
      viewport: SCRAPER_CONFIG.viewport,
      userAgent: SCRAPER_CONFIG.userAgent,
      permissions: [],
      locale: 'en-US',
      timezoneId: 'America/New_York',
      ignoreHTTPSErrors: true,
    });

    await context.route('**/*', (route) => {
      if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) route.abort();
      else route.continue();
    });

    this.browser = browser;
    this.context = context;
    logger.info('BrowserManager: browser ready');
  }

  async newPage(): Promise<Page> {
    if (!this.context) await this.launch();
    const page = await this.context!.newPage();
    page.setDefaultTimeout(SCRAPER_CONFIG.navigationTimeoutMs);
    page.setDefaultNavigationTimeout(SCRAPER_CONFIG.navigationTimeoutMs);
    return page;
  }

  /** Idempotent and safe to call from stop() while a session is mid-flight. */
  async close(): Promise<void> {
    const context = this.context;
    const browser = this.browser;
    this.context = null;
    this.browser = null;

    if (context) await context.close().catch(noop);
    if (browser) {
      await browser.close().catch(noop);
      logger.info('BrowserManager: browser closed');
    }
  }
}

// ---------------------------------------------------------------------------
// Utility: randomized delay to mimic human pacing
// ---------------------------------------------------------------------------

export function randomDelay(
  minMs = SCRAPER_CONFIG.minDelayMs,
  maxMs = SCRAPER_CONFIG.maxDelayMs,
): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Utility: exponential backoff retry (2 s, 4 s, 8 s)
// ---------------------------------------------------------------------------

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = SCRAPER_CONFIG.maxRetries,
  attempt = 1,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    const delay = SCRAPER_CONFIG.backoffBaseMs * Math.pow(2, attempt - 1);
    logger.warn(`Retrying after ${delay}ms (attempt ${attempt})`, {
      error: (err as Error).message,
    });
    await new Promise((r) => setTimeout(r, delay));
    return withRetry(fn, retries - 1, attempt + 1);
  }
}
