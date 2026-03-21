import { BrowserManager } from './src/services/scraper/browser.manager';
import { MapsNavigator } from './src/services/scraper/maps.navigator';

const bm = BrowserManager.getInstance();
const nav = new MapsNavigator();

bm.launch().then(async () => {
  const page = await bm.newPage();
  const ok = await nav.navigateToSearch(page, '10001', 'restaurants');
  console.log('loaded:', ok);
  const count = await nav.scrollResultsToLoad(page, 12, 8);
  console.log('cards after scroll:', count);
  await bm.close();
});
