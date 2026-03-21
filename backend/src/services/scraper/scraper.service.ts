import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { BrowserManager, randomDelay, withRetry } from './browser.manager';
import { MapsNavigator } from './maps.navigator';
import { MapsExtractor } from './maps.extractor';
import { ScraperState, INITIAL_STATE } from './scraper.types';
import { Deduplicator } from '../../utils/deduplicator';
import { getRepository } from '../../data/repository.factory';
import { scoreLead } from '../lead/lead.scorer';
import { logger } from '../../utils/logger';
import { Business } from '../../types/business.types';

// ---------------------------------------------------------------------------
// ScraperService
//
// Orchestrates the scraping session:
//  - Maintains session state (running, counters)
//  - Controls the p-queue (concurrency = 1, always sequential)
//  - Provides start / stop API
//  - Delegates page navigation to MapsExtractor (step 3.2)
//  - Delegates deduplication to Deduplicator (step 3.5)
//
// Only one scraping session can run at a time.
// ---------------------------------------------------------------------------

export class ScraperService {
  private static _instance: ScraperService | null = null;

  private state: ScraperState = { ...INITIAL_STATE };
  private queue: PQueue;
  private stopRequested = false;

  private constructor() {
    // Concurrency 1 = never parallel, always sequential requests
    this.queue = new PQueue({ concurrency: 1 });
  }

  static getInstance(): ScraperService {
    if (!ScraperService._instance) {
      ScraperService._instance = new ScraperService();
    }
    return ScraperService._instance;
  }

  getState(): ScraperState {
    return { ...this.state };
  }

  async start(
    zipcode: string,
    category = 'businesses',
    maxResults = 50,
  ): Promise<void> {
    if (this.state.running) {
      throw new Error('A scraping session is already running. Stop it first.');
    }

    this.stopRequested = false;
    this.state = {
      ...INITIAL_STATE,
      running: true,
      zipcode,
      category,
      maxResults,
      startedAt: new Date().toISOString(),
    };

    logger.info('Scraper started', { zipcode, category, maxResults });

    // Run in background — do not await, caller gets immediate response
    this.queue.add(() => this.runSession(zipcode, category, maxResults));
  }

  stop(): void {
    if (!this.state.running) return;
    this.stopRequested = true;
    logger.info('Scraper stop requested');
  }

  private async runSession(
    zipcode: string,
    category: string,
    maxResults: number,
  ): Promise<void> {
    const bm = BrowserManager.getInstance();
    const nav = new MapsNavigator();
    const extractor = new MapsExtractor();
    const repo = getRepository();
    const dedup = new Deduplicator();

    try {
      await bm.launch();
      const page = await bm.newPage();

      // Load existing records into deduplicator before scraping starts
      await dedup.load(repo);

      // Navigate to search results
      const loaded = await nav.navigateToSearch(page, zipcode, category);
      if (!loaded) {
        logger.warn('No results loaded — possible CAPTCHA or no listings found');
        return;
      }

      // Scroll to load enough cards
      const totalCards = await nav.scrollResultsToLoad(page, maxResults);
      this.state.found = totalCards;

      // Pre-collect all card data in one pass before clicking anything.
      // Clicking + re-navigating causes DOM re-renders that shift card indices.
      const cardDataList = [];
      for (let i = 0; i < Math.min(totalCards, maxResults); i++) {
        const card = await extractor.extractFromCard(page, i);
        if (card) cardDataList.push(card);
      }
      logger.info('Card data pre-collected', { count: cardDataList.length });

      // Process each card: click by name → extract detail → re-navigate back
      for (const cardData of cardDataList) {
        if (this.stopRequested) break;

        await withRetry(async () => {
          const opened = await nav.openListingByName(page, cardData.name);
          if (!opened) {
            this.state.errors++;
            return;
          }

          const raw = await extractor.extractFromDetail(page, cardData, zipcode);
          if (!raw) {
            this.state.errors++;
            await nav.goBackToResults(page, zipcode, category);
            return;
          }

          // Deduplication check
          const dupId = dedup.isDuplicate(raw);
          if (dupId) {
            logger.debug('Skipping duplicate', { name: raw.name, dupId });
            this.state.skipped++;
            await nav.goBackToResults(page, zipcode, category);
            return;
          }

          // Score and build the full business record
          const { score, priority } = scoreLead(raw);
          const now = new Date().toISOString();

          const business: Business = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            ...raw,
            keywords: [],
            summary: null,
            insights: null,
            generatedWebsiteCode: null,
            outreach: null,
            githubUrl: null,
            deployedUrl: null,
            leadStatus: 'new',
            priority,
            priorityScore: score,
            notes: null,
            lastContactedAt: null,
          };

          await repo.create(business);
          dedup.register(business);
          this.state.saved++;

          logger.info('Business saved', {
            name: business.name,
            priority: business.priority,
            score: business.priorityScore,
          });

          await nav.goBackToResults(page, zipcode, category);
          await randomDelay();
        });
      }

      await page.close();

    } catch (err) {
      logger.error('Scraper session failed', { error: (err as Error).message });
      this.state.errors++;
    } finally {
      await bm.close();
      this.state.running = false;
      this.state.finishedAt = new Date().toISOString();
      logger.info('Scraper session finished', {
        found: this.state.found,
        saved: this.state.saved,
        skipped: this.state.skipped,
        errors: this.state.errors,
      });
    }
  }
}
