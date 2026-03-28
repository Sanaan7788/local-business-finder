import { chromium } from 'playwright';
import { CrawledPage } from '../../types/business.types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// WebsiteCrawlerService
//
// Crawls a business website: homepage + all internal links (max 10 pages).
// Uses Playwright (headless Chromium) so JS-rendered pages work too.
// ---------------------------------------------------------------------------

const MAX_PAGES = 10;
const TIMEOUT_MS = 30_000;

// Paths to skip — these rarely contain useful business content
const SKIP_PATTERNS = [
  /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot)$/i,
  /\/(wp-admin|wp-login|wp-json|feed|rss|sitemap|robots)/i,
  /#.*/,
];

export const WebsiteCrawlerService = {

  async crawl(startUrl: string): Promise<CrawledPage[]> {
    // Normalise start URL — ensure it has a scheme
    if (!/^https?:\/\//i.test(startUrl)) startUrl = 'https://' + startUrl;

    let base = new URL(startUrl);
    const visited = new Set<string>();
    const queue: string[] = [startUrl];
    const results: CrawledPage[] = [];

    logger.info('WebsiteCrawler: starting crawl', { url: startUrl });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    try {
      while (queue.length > 0 && results.length < MAX_PAGES) {
        const url = queue.shift()!;
        const normalised = normaliseUrl(url);
        if (visited.has(normalised)) continue;
        if (shouldSkip(url)) continue;
        visited.add(normalised);

        logger.debug('WebsiteCrawler: visiting page', { url });

        const page = await context.newPage();
        try {
          // Use 'load' + fixed wait — works for GoDaddy/Wix/Squarespace SPAs.
          // 'networkidle' times out on these sites because they keep polling in the background.
          try {
            await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT_MS });
          } catch (gotoErr: any) {
            logger.warn('WebsiteCrawler: load failed, trying domcontentloaded', { url, error: gotoErr.message });
            try {
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            } catch (gotoErr2: any) {
              logger.warn('WebsiteCrawler: domcontentloaded also failed, continuing anyway', { url, error: gotoErr2.message });
              // Don't rethrow — the page may still have partial content
            }
          }
          // Give JS time to render content into the DOM
          await page.waitForTimeout(3000);

          // After redirect, update base hostname so internal link detection still works
          const finalUrl = page.url();
          if (results.length === 0) {
            try { base = new URL(finalUrl); } catch { /* keep original */ }
          }

          // Pass as a string so tsx/esbuild cannot transform it — avoids __name injection bug
          const data = await page.evaluate(`(function() {
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
            var hasEmail = /[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/.test(bodyText);
            var images = document.querySelectorAll('img').length;
            var title = document.title ? document.title.trim() : '';
            return { headings: headings, paragraphs: paragraphs, navLinks: navLinks, allLinks: allLinks, hasContactForm: hasContactForm, hasPhone: hasPhone, hasEmail: hasEmail, images: images, title: title };
          })()`
          ) as { headings: string[]; paragraphs: string[]; navLinks: string[]; allLinks: string[]; hasContactForm: boolean; hasPhone: boolean; hasEmail: boolean; images: number; title: string };

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
          });

          // Enqueue same-domain links (match www/non-www variants)
          const baseDomain = base.hostname.replace(/^www\./, '');
          for (const link of data.allLinks) {
            try {
              const linkUrl = new URL(link);
              const linkDomain = linkUrl.hostname.replace(/^www\./, '');
              if (linkDomain === baseDomain) {
                const norm = normaliseUrl(link);
                if (!visited.has(norm) && !shouldSkip(link)) {
                  queue.push(link);
                }
              }
            } catch {
              // Invalid URL — skip
            }
          }

        } catch (err: any) {
          logger.warn('WebsiteCrawler: page error', { url, error: err.message, stack: err.stack?.split('\n')[0] });
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
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
    // Remove trailing slash and fragment
    return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(url));
}
