import { BrowserManager } from './src/services/scraper/browser.manager';
import { MapsNavigator } from './src/services/scraper/maps.navigator';

// Inspect current Google Maps DOM selectors
// Run with: npx tsx inspect-selectors.ts

async function inspect() {
  const bm = BrowserManager.getInstance();
  await bm.launch();
  const page = await bm.newPage();
  const nav = new MapsNavigator();

  const zipcode = '77477';
  const category = 'restaurants';

  console.log('Navigating to Maps search...');
  await nav.navigateToSearch(page, zipcode, category);

  // ── Card-level selectors ──────────────────────────────────────────────────
  console.log('\n=== CARD SELECTORS ===');

  const cardCount = await page.locator('.Nv2PK').count();
  console.log(`Cards found (.Nv2PK): ${cardCount}`);

  if (cardCount > 0) {
    const card = page.locator('.Nv2PK').first();

    // Try multiple name selectors
    const nameCandidates = [
      '.fontHeadlineSmall',
      '[class*="fontHeadline"]',
      'a[href*="/maps/place/"] .fontHeadlineSmall',
      '.qBF1Pd',
      '.NrDZNb .fontHeadlineSmall',
    ];

    console.log('\nName selector candidates (first card):');
    for (const sel of nameCandidates) {
      try {
        const text = await card.locator(sel).first().textContent({ timeout: 2000 });
        console.log(`  "${sel}" → "${text?.trim()}"`);
      } catch {
        console.log(`  "${sel}" → NOT FOUND`);
      }
    }

    // Dump all text from the first card
    console.log('\nAll text content from first card:');
    const allText = await card.evaluate(el => {
      const spans = el.querySelectorAll('*');
      const texts: string[] = [];
      spans.forEach(s => {
        const t = (s as HTMLElement).innerText?.trim();
        if (t && t.length > 1 && t.length < 100) texts.push(`[${s.className.slice(0,30)}]: ${t}`);
      });
      return texts.slice(0, 20);
    });
    allText.forEach(t => console.log(' ', t));
  }

  // ── Click first card and inspect detail panel ─────────────────────────────
  console.log('\n=== DETAIL PANEL SELECTORS ===');
  await page.locator('.Nv2PK').first().click();
  await page.waitForTimeout(3000);

  // Try multiple h1 / name selectors in detail
  const detailNameCandidates = [
    'h1',
    'h1.DUwDvf',
    '[class*="fontHeadlineLarge"]',
    '.DUwDvf',
    '.lMbq3e h1',
  ];

  console.log('\nDetail name selector candidates:');
  for (const sel of detailNameCandidates) {
    try {
      const text = await page.locator(sel).first().textContent({ timeout: 2000 });
      console.log(`  "${sel}" → "${text?.trim()}"`);
    } catch {
      console.log(`  "${sel}" → NOT FOUND`);
    }
  }

  // Check all h1 tags on the page
  const h1s = await page.locator('h1').all();
  console.log(`\nAll h1 tags (${h1s.length}):`);
  for (const h of h1s) {
    const text = await h.textContent().catch(() => '');
    const cls = await h.getAttribute('class').catch(() => '');
    console.log(`  class="${cls}" → "${text?.trim()}"`);
  }

  await bm.close();
  console.log('\nDone.');
}

inspect().catch(e => { console.error(e.message); process.exit(1); });
