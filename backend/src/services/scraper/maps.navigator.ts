import { Page } from 'playwright';
import { randomDelay } from './browser.manager';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Selectors — isolated here so DOM changes only require updates in one place
// ---------------------------------------------------------------------------

const SELECTORS = {
  searchInput: 'input[name="q"]',
  resultsFeed: '[role="feed"]',
  // Each listing card in the results list
  listingCard: '.Nv2PK',
  // Detect CAPTCHA
  captcha: 'iframe[src*="recaptcha"], #captcha, .captcha',
};

// Selector that confirms the detail panel has loaded.
// Try h1.DUwDvf first (current Maps), fall back to any h1 inside the panel.
const DETAIL_LOADED_SELECTOR = 'h1.DUwDvf, h1[class*="DUwDvf"], [role="main"] h1';

// ---------------------------------------------------------------------------
// MapsNavigator
//
// Responsibilities:
//   1. Navigate to Google Maps with a search query (zipcode + category)
//   2. Detect and report CAPTCHAs
//   3. Scroll the results feed to load more listings
//   4. Return the count of visible listing cards
//
// Does NOT extract data — that is MapsExtractor (step 3.3).
// ---------------------------------------------------------------------------

export class MapsNavigator {

  // Build the search URL directly — faster than typing into the search box,
  // and results in the same page state.
  static buildSearchUrl(zipcode: string, category: string): string {
    const query = encodeURIComponent(`${category} near ${zipcode}`);
    return `https://www.google.com/maps/search/${query}`;
  }

  // Navigate to Maps search results for a zipcode + category.
  // Returns true if results loaded, false if CAPTCHA or no results.
  async navigateToSearch(
    page: Page,
    zipcode: string,
    category: string,
  ): Promise<boolean> {
    const url = MapsNavigator.buildSearchUrl(zipcode, category);
    logger.info('Navigating to Maps search', { zipcode, category, url });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await randomDelay(2000, 3000);

    // CAPTCHA check
    if (await this.hasCaptcha(page)) {
      logger.warn('CAPTCHA detected — stopping scraper');
      return false;
    }

    // Wait for the results feed to appear
    try {
      await page.waitForSelector(SELECTORS.resultsFeed, { timeout: 15_000 });
    } catch {
      logger.warn('Results feed did not appear', { zipcode, category });
      return false;
    }

    const count = await page.locator(SELECTORS.listingCard).count();
    logger.info('Initial results loaded', { count });
    return count > 0;
  }

  // Scroll the results sidebar to load more listings.
  // Google Maps lazy-loads listings as you scroll the left panel.
  // Returns total number of visible cards after scrolling.
  async scrollResultsToLoad(
    page: Page,
    targetCount: number,
    maxScrolls = 20,
  ): Promise<number> {
    const feed = page.locator(SELECTORS.resultsFeed);

    let previousCount = 0;
    let stallCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
      const currentCount = await page.locator(SELECTORS.listingCard).count();

      logger.debug('Scroll progress', { scroll: i + 1, cards: currentCount, target: targetCount });

      if (currentCount >= targetCount) {
        logger.info('Target listing count reached', { count: currentCount });
        break;
      }

      // If count stopped growing for 3 consecutive scrolls — end of results
      if (currentCount === previousCount) {
        stallCount++;
        if (stallCount >= 3) {
          logger.info('No more listings to load (end of results)', { count: currentCount });
          break;
        }
      } else {
        stallCount = 0;
      }

      previousCount = currentCount;

      // Scroll the feed panel (not the whole page)
      await feed.evaluate((el) => el.scrollBy(0, 800));
      await randomDelay(1500, 2500);

      // CAPTCHA can appear mid-scroll
      if (await this.hasCaptcha(page)) {
        logger.warn('CAPTCHA detected during scroll — stopping');
        break;
      }
    }

    const finalCount = await page.locator(SELECTORS.listingCard).count();
    logger.info('Scrolling complete', { finalCount });
    return finalCount;
  }

  // Navigate directly to a listing's detail page by URL.
  // This is far more reliable than click-then-back — no stale DOM, no wrong-card issues.
  // Returns true if the detail panel loaded.
  async openListingByUrl(page: Page, url: string): Promise<boolean> {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await randomDelay(1500, 2500);
      // Wait for the detail panel to confirm it loaded — try multiple selectors
      await page.waitForSelector(DETAIL_LOADED_SELECTOR, { timeout: 12_000 });
      return true;
    } catch (err) {
      logger.warn('Failed to open listing by URL', { url, error: (err as Error).message });
      return false;
    }
  }

  // Fallback: click a listing by name when no URL is available.
  async openListingByName(page: Page, name: string): Promise<boolean> {
    try {
      const card = page.locator(SELECTORS.listingCard).filter({ hasText: name }).first();
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await randomDelay(1500, 2500);
      await page.waitForSelector(DETAIL_LOADED_SELECTOR, { timeout: 12_000 });
      return true;
    } catch (err) {
      logger.warn('Failed to open listing by name (fallback)', { name, error: (err as Error).message });
      return false;
    }
  }

  // Return to search results page.
  async goBackToResults(page: Page, zipcode: string, category: string): Promise<void> {
    const url = MapsNavigator.buildSearchUrl(zipcode, category);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector(SELECTORS.listingCard, { timeout: 12_000 });
    } catch {
      await randomDelay(2000, 3000);
    }
    await randomDelay(800, 1500);
  }

  private async hasCaptcha(page: Page): Promise<boolean> {
    const count = await page.locator(SELECTORS.captcha).count();
    return count > 0;
  }
}
