import { chromium, Browser, BrowserContext } from 'playwright';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Scraper config
// Conservative pacing to avoid IP blocks and CAPTCHAs.
// All values are intentionally slow — this is personal use, not bulk ops.
// ---------------------------------------------------------------------------

export const SCRAPER_CONFIG = {
  // Set SCRAPER_DEBUG=true in .env to watch the browser while debugging
  headless: process.env.SCRAPER_DEBUG !== 'true',
  minDelayMs: 2000,             // Min pause between page actions
  maxDelayMs: 5000,             // Max pause (randomized within range)
  navigationTimeoutMs: 30_000,  // Max time to wait for page load
  maxRetries: 3,                // Retry attempts on transient failure
  backoffBaseMs: 2000,          // Base delay for exponential backoff
  viewport: { width: 1280, height: 800 },
  // Realistic user agent — avoids basic bot detection
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/121.0.0.0 Safari/537.36',
};

// ---------------------------------------------------------------------------
// BrowserManager
//
// Maintains a single Browser + BrowserContext across scraping sessions.
// One context = one isolated "user session" (cookies, storage, etc.)
//
// Usage:
//   const bm = BrowserManager.getInstance();
//   const page = await bm.newPage();
//   // ... use page ...
//   await page.close();
//   await bm.close(); // call when scraping session is fully done
// ---------------------------------------------------------------------------

export class BrowserManager {
  private static _instance: BrowserManager | null = null;

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  private constructor() {}

  static getInstance(): BrowserManager {
    if (!BrowserManager._instance) {
      BrowserManager._instance = new BrowserManager();
    }
    return BrowserManager._instance;
  }

  async launch(): Promise<void> {
    if (this.browser) {
      logger.debug('BrowserManager: browser already running');
      return;
    }

    logger.info('BrowserManager: launching Chromium');

    this.browser = await chromium.launch({
      headless: SCRAPER_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // reduce bot signal
        '--disable-infobars',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: SCRAPER_CONFIG.viewport,
      userAgent: SCRAPER_CONFIG.userAgent,
      // Disable location prompts
      geolocation: undefined,
      permissions: [],
      // Emulate a real locale
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Block heavy assets that don't affect text data extraction.
    // Keep stylesheet — Google Maps needs CSS to render the search box and results.
    await this.context.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    logger.info('BrowserManager: browser ready');
  }

  async newPage() {
    if (!this.context) {
      await this.launch();
    }
    const page = await this.context!.newPage();
    page.setDefaultTimeout(SCRAPER_CONFIG.navigationTimeoutMs);
    page.setDefaultNavigationTimeout(SCRAPER_CONFIG.navigationTimeoutMs);
    return page;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('BrowserManager: browser closed');
    }
    BrowserManager._instance = null;
  }

  isRunning(): boolean {
    return this.browser !== null;
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
// Utility: exponential backoff retry
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
