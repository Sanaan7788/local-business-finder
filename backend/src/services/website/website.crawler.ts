import { chromium } from 'playwright';
import { CrawledPage } from '../../types/business.types';
import { BLOCKED_RESOURCE_TYPES, CHROMIUM_LAUNCH_ARGS, SCRAPER_CONFIG } from '../scraper/browser.manager';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// WebsiteCrawlerService
//
// Crawls a business website: homepage + internal links (max 10 pages) with
// headless Chromium so JS-rendered sites work. It launches its own browser
// rather than sharing BrowserManager, because the scraper's stop() closes
// that one and an unrelated crawl must not be killed by it (or vice versa).
// ---------------------------------------------------------------------------

const MAX_PAGES = 10;
const NAVIGATION_TIMEOUT_MS = 15_000;
const NETWORK_IDLE_TIMEOUT_MS = 3_000;
const SETTLE_MS = 300;

// Paths to skip — these rarely contain useful business content
const SKIP_PATTERNS = [
  /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot)$/i,
  /\/(wp-admin|wp-login|wp-json|feed|rss|sitemap|robots)/i,
  /#.*/,
];

const noop = () => undefined;

interface PageData {
  headings: string[];
  paragraphs: string[];
  navLinks: string[];
  allLinks: string[];
  hasContactForm: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  emails: string[];
  images: number;
  title: string;
}

// Passed to page.evaluate as a string so tsx/esbuild cannot transform it
// (avoids the __name helper injection that breaks in the browser context).
const EXTRACT_SCRIPT = `(function() {
  function texts(sel) {
    return Array.from(document.querySelectorAll(sel))
      .map(function(el) { return el.innerText ? el.innerText.trim() : ''; })
      .filter(function(t) { return t.length > 2 && t.length < 500; });
  }
  var headings = texts('h1, h2, h3');
  var paragraphs = texts('p, li').slice(0, 30);
  var navLinks = Array.from(document.querySelectorAll('nav a, header a'))
    .map(function(a) { return a.innerText ? a.innerText.trim() : ''; })
    .filter(function(t) { return t.length > 1 && t.length < 60; });
  var allLinks = Array.from(document.querySelectorAll('a[href]'))
    .map(function(a) { return a.href; })
    .filter(Boolean);
  var bodyText = document.body ? document.body.innerText : '';
  var hasContactForm = !!document.querySelector('form input[type="email"], form textarea');
  var hasPhone = /\\(?\\d{3}\\)?[\\s.-]\\d{3}[\\s.-]\\d{4}/.test(bodyText);
  var emailMatches = bodyText.match(/[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/g) || [];
  var mailtoEmails = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
    .map(function(a) { return a.getAttribute('href').replace('mailto:', '').split('?')[0].trim(); });
  var allEmails = Array.from(new Set(emailMatches.concat(mailtoEmails)))
    .filter(function(e) { return e.length > 5 && !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('yourdomain'); });
  var images = document.querySelectorAll('img').length;
  var title = document.title ? document.title.trim() : '';
  return { headings: headings, paragraphs: paragraphs, navLinks: navLinks, allLinks: allLinks, hasContactForm: hasContactForm, hasPhone: hasPhone, hasEmail: allEmails.length > 0, emails: allEmails, images: images, title: title };
})()`;

export const WebsiteCrawlerService = {

  async crawl(startUrl: string): Promise<CrawledPage[]> {
    if (!/^https?:\/\//i.test(startUrl)) startUrl = 'https://' + startUrl;

    let base = new URL(startUrl);
    const visited = new Set<string>();
    const queue: string[] = [startUrl];
    const results: CrawledPage[] = [];

    logger.info('WebsiteCrawler: starting crawl', { url: startUrl });

    const browser = await chromium.launch({ headless: true, args: CHROMIUM_LAUNCH_ARGS });
    const context = await browser.newContext({
      userAgent: SCRAPER_CONFIG.userAgent,
      ignoreHTTPSErrors: true,
    });
    await context.route('**/*', (route) => {
      if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) route.abort();
      else route.continue();
    });

    try {
      while (queue.length > 0 && results.length < MAX_PAGES) {
        const url = queue.shift()!;
        const normalised = normaliseUrl(url);
        if (visited.has(normalised) || shouldSkip(url)) continue;
        visited.add(normalised);

        logger.debug('WebsiteCrawler: visiting page', { url });

        const page = await context.newPage();
        try {
          // domcontentloaded, then a short networkidle wait capped at 3 s —
          // Wix/GoDaddy/Squarespace poll forever and would never go idle.
          await page
            .goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
            .catch((err: Error) => logger.warn('WebsiteCrawler: navigation failed, reading partial DOM', { url, error: err.message }));
          await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(noop);
          await page.waitForTimeout(SETTLE_MS);

          // After a redirect, follow the final hostname for internal-link detection
          if (results.length === 0) {
            try { base = new URL(page.url()); } catch { /* keep original */ }
          }

          const data = (await page.evaluate(EXTRACT_SCRIPT)) as PageData;

          results.push({
            url,
            title: data.title,
            headings: data.headings,
            paragraphs: data.paragraphs,
            navLinks: data.navLinks,
            images: data.images,
            hasContactForm: data.hasContactForm,
            hasPhone: data.hasPhone,
            hasEmail: data.hasEmail,
            emails: data.emails ?? [],
          });

          // Enqueue same-domain links (www and non-www are the same site)
          const baseDomain = base.hostname.replace(/^www\./, '');
          for (const link of data.allLinks) {
            try {
              const linkDomain = new URL(link).hostname.replace(/^www\./, '');
              if (linkDomain === baseDomain && !visited.has(normaliseUrl(link)) && !shouldSkip(link)) {
                queue.push(link);
              }
            } catch {
              // Invalid URL — skip
            }
          }
        } catch (err) {
          logger.warn('WebsiteCrawler: page error', { url, error: (err as Error).message });
        } finally {
          await page.close().catch(noop);
        }
      }
    } finally {
      await browser.close().catch(noop);
    }

    logger.info('WebsiteCrawler: crawl complete', { pagesVisited: results.length });
    return results;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(url));
}
