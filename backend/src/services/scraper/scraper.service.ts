import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { BrowserManager, randomDelay, withRetry } from './browser.manager';
import { MapsNavigator } from './maps.navigator';
import { MapsExtractor } from './maps.extractor';
import { ScraperState, INITIAL_STATE } from './scraper.types';
import { ScrapeHistory } from './scrape.history';
import { Deduplicator } from '../../utils/deduplicator';
import { getRepository } from '../../data/repository.factory';
import { scoreLead } from '../lead/lead.scorer';
import { logger } from '../../utils/logger';
import { Business } from '../../types/business.types';

export class ScraperService {
  private static _instance: ScraperService | null = null;

  private state: ScraperState = { ...INITIAL_STATE };
  private queue: PQueue;
  private stopRequested = false;

  private constructor() {
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

  async start(zipcode: string, category = 'businesses', maxResults = 50): Promise<void> {
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
    this.queue.add(() => this.runSession(zipcode, category, maxResults));
  }

  stop(): void {
    if (!this.state.running) return;
    this.stopRequested = true;
    logger.info('Scraper stop requested');
  }

  private async runSession(zipcode: string, category: string, maxResults: number): Promise<void> {
    const bm = BrowserManager.getInstance();
    const nav = new MapsNavigator();
    const extractor = new MapsExtractor();
    const repo = getRepository();
    const dedup = new Deduplicator();

    try {
      await bm.launch();
      const page = await bm.newPage();

      await dedup.load(repo);

      const loaded = await nav.navigateToSearch(page, zipcode, category);
      if (!loaded) {
        logger.warn('No results loaded — possible CAPTCHA or no listings found');
        return;
      }

      const totalCards = await nav.scrollResultsToLoad(page, maxResults);
      this.state.found = totalCards;

      // Pre-collect all card data, recording every name we found
      const cardDataList = [];
      for (let i = 0; i < Math.min(totalCards, maxResults); i++) {
        const card = await extractor.extractFromCard(page, i);
        if (card) {
          cardDataList.push(card);
          this.state.foundNames.push(card.name);
        }
      }
      logger.info('Card data pre-collected', { count: cardDataList.length });

      // Process each card
      for (const cardData of cardDataList) {
        if (this.stopRequested) break;

        await withRetry(async () => {
          const opened = await nav.openListingByName(page, cardData.name);
          if (!opened) {
            this.state.errors++;
            this.state.errorList.push({ name: cardData.name, message: 'Failed to open listing panel' });
            return;
          }

          const raw = await extractor.extractFromDetail(page, cardData, zipcode);
          if (!raw) {
            this.state.errors++;
            this.state.errorList.push({ name: cardData.name, message: 'Failed to extract detail data' });
            await nav.goBackToResults(page, zipcode, category);
            return;
          }

          // Deduplication check
          const dupId = dedup.isDuplicate(raw);
          if (dupId) {
            // Determine which index matched for the skip reason
            const normalizedPhone = raw.phone?.replace(/\D/g, '') ?? '';
            const reason = (normalizedPhone && dedup.hasPhone(normalizedPhone)) ? 'phone' : 'name+address';
            logger.debug('Skipping duplicate', { name: raw.name, dupId });
            this.state.skipped++;
            this.state.skippedList.push({
              name: raw.name,
              address: raw.address,
              reason,
              existingId: dupId,
            });
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
          this.state.savedList.push({
            id: business.id,
            name: business.name,
            address: business.address,
            phone: business.phone,
            priority: business.priority,
            priorityScore: business.priorityScore,
            website: business.website,
          });

          logger.info('Business saved', { name: business.name, priority, score });

          await nav.goBackToResults(page, zipcode, category);
          await randomDelay();
        });
      }

      await page.close();

    } catch (err) {
      logger.error('Scraper session failed', { error: (err as Error).message });
      this.state.errors++;
      this.state.errorList.push({ name: 'session', message: (err as Error).message });
    } finally {
      await bm.close();
      this.state.running = false;
      this.state.finishedAt = new Date().toISOString();

      // Persist session to history
      ScrapeHistory.save(this.state);

      logger.info('Scraper session finished', {
        found: this.state.found,
        saved: this.state.saved,
        skipped: this.state.skipped,
        errors: this.state.errors,
      });
    }
  }
}
