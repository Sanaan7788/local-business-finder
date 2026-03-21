import { BrowserManager } from './src/services/scraper/browser.manager';
import { MapsNavigator } from './src/services/scraper/maps.navigator';
import { MapsExtractor } from './src/services/scraper/maps.extractor';

// Verification script for step 3.3
// Run with: npx tsx test-extractor.ts

async function verify() {
  const bm = BrowserManager.getInstance();
  const nav = new MapsNavigator();
  const extractor = new MapsExtractor();

  await bm.launch();
  const page = await bm.newPage();

  console.log('--- Step 3.3 Verification ---\n');

  await nav.navigateToSearch(page, '10001', 'restaurants');
  await nav.scrollResultsToLoad(page, 5, 5);

  // Step 1: collect all card data in one pass (no clicking yet)
  const totalCards = await page.locator('.Nv2PK').count();
  console.log('Cards visible:', totalCards);

  const cardDataList = [];
  for (let i = 0; i < Math.min(3, totalCards); i++) {
    const card = await extractor.extractFromCard(page, i);
    if (card) cardDataList.push(card);
  }
  console.log('Cards pre-extracted:', cardDataList.map(c => c.name));

  // Step 2: for each card, click by name → extract detail → go back
  const results = [];
  for (const cardData of cardDataList) {
    console.log(`\nOpening detail for: ${cardData.name}`);

    const opened = await nav.openListingByName(page, cardData.name);
    if (!opened) { console.log('  ✗ could not open listing'); continue; }

    const business = await extractor.extractFromDetail(page, cardData, '10001');
    if (!business) { console.log('  ✗ detail extraction failed'); continue; }

    console.log('  ✓ name:', business.name);
    console.log('  ✓ phone:', business.phone);
    console.log('  ✓ address:', business.address);
    console.log('  ✓ website:', business.website, '→', business.websiteUrl);
    console.log('  ✓ rating:', business.rating, '| reviews:', business.reviewCount);
    console.log('  ✓ category:', business.category);
    console.log('  ✓ description:', business.description);

    results.push(business);
    await nav.goBackToResults(page, '10001', 'restaurants');
  }

  console.log('\n--- Summary ---');
  console.log('Successfully extracted:', results.length, '/', cardDataList.length);
  console.log('With website:', results.filter(b => b.website).length);
  console.log('With phone:', results.filter(b => b.phone).length);
  console.log('With rating:', results.filter(b => b.rating !== null).length);

  await page.close();
  await bm.close();
}

verify().catch(e => { console.error(e); process.exit(1); });
