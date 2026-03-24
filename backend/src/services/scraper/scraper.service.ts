import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { BrowserManager, randomDelay, withRetry } from './browser.manager';
import { MapsNavigator } from './maps.navigator';
import { MapsExtractor } from './maps.extractor';
import { ScraperState, INITIAL_STATE } from './scraper.types';
import { ScrapeHistory } from './scrape.history';
import { ScrapeHistoryPostgres } from './scrape.history.postgres';
import { Deduplicator } from '../../utils/deduplicator';
import { getRepository } from '../../data/repository.factory';
import { IBusinessRepository } from '../../data/repository.interface';
import { scoreLead } from '../lead/lead.scorer';
import { logger } from '../../utils/logger';
import { Business } from '../../types/business.types';

export interface BatchJob {
  zipcode: string;
  category: string;
  maxResults: number;
}

export interface BatchProgress {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: BatchJob[];
}

export class ScraperService {
  private static _instance: ScraperService | null = null;

  private state: ScraperState = { ...INITIAL_STATE };
  private queue: PQueue;
  private stopRequested = false;

  // Batch mode tracking
  private batchPending: BatchJob[] = [];
  private batchTotal = 0;
  private batchCompleted = 0;

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

  getBatchProgress(): BatchProgress {
    return {
      totalJobs: this.batchTotal,
      completedJobs: this.batchCompleted,
      pendingJobs: [...this.batchPending],
    };
  }

  async start(zipcode: string, category = 'businesses', maxResults = 50): Promise<void> {
    if (this.state.running || this.queue.size > 0) {
      throw new Error('A scraping session is already running. Stop it first.');
    }

    this.stopRequested = false;
    this.batchTotal = 1;
    this.batchCompleted = 0;
    this.batchPending = [];

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

  /** Queue multiple category searches for the same zipcode */
  async startBatch(zipcode: string, categories: string[], maxResults = 20): Promise<void> {
    if (this.state.running || this.queue.size > 0) {
      throw new Error('A scraping session is already running. Stop it first.');
    }

    this.stopRequested = false;
    this.batchTotal = categories.length;
    this.batchCompleted = 0;
    this.batchPending = categories.map(cat => ({ zipcode, category: cat, maxResults }));

    // Kick off first job immediately by setting state, then queue all
    const [first, ...rest] = this.batchPending;
    this.batchPending = rest;

    this.state = {
      ...INITIAL_STATE,
      running: true,
      zipcode: first.zipcode,
      category: first.category,
      maxResults: first.maxResults,
      startedAt: new Date().toISOString(),
    };

    logger.info('Batch scraper started', { zipcode, categories: categories.length, maxResults });

    // Queue all jobs sequentially
    for (const job of [first, ...rest]) {
      this.queue.add(() => this.runBatchJob(job));
    }
  }

  private async runBatchJob(job: BatchJob): Promise<void> {
    if (this.stopRequested) return;

    this.state = {
      ...INITIAL_STATE,
      running: true,
      zipcode: job.zipcode,
      category: job.category,
      maxResults: job.maxResults,
      startedAt: new Date().toISOString(),
    };

    // Remove from pending
    this.batchPending = this.batchPending.filter(
      j => !(j.zipcode === job.zipcode && j.category === job.category),
    );

    await this.runSession(job.zipcode, job.category, job.maxResults);
    this.batchCompleted++;
  }

  /** Create a minimal stub record for a business that errored during scraping */
  private async createErrorStub(
    repo: IBusinessRepository,
    name: string,
    category: string,
    zipcode: string,
    errorMsg: string,
  ): Promise<void> {
    try {
      const { score, priority } = scoreLead({ name, category, zipcode, website: false });
      const now = new Date().toISOString();
      const business: Business = {
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        name,
        phone: null,
        address: '',
        zipcode,
        category,
        description: null,
        website: false,
        websiteUrl: null,
        rating: null,
        reviewCount: null,
        googleMapsUrl: null,
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
        notes: `Scrape error: ${errorMsg}`,
        lastContactedAt: null,
      };
      await repo.create(business);
      logger.debug('Created error stub', { name });
    } catch (err) {
      logger.warn('Failed to create error stub', { name, error: (err as Error).message });
    }
  }

  stop(): void {
    if (!this.state.running) return;
    this.stopRequested = true;
    this.queue.clear();
    this.batchPending = [];
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

      // Process each card — navigate directly to its URL, no clicking needed
      for (const cardData of cardDataList) {
        if (this.stopRequested) break;

        await withRetry(async () => {
          // Prefer direct URL navigation (reliable); fall back to search-results click
          let opened = false;
          if (cardData.googleMapsUrl) {
            opened = await nav.openListingByUrl(page, cardData.googleMapsUrl);
          }

          if (!opened) {
            // Fallback: go back to results and try clicking by name
            await nav.goBackToResults(page, zipcode, category);
            opened = await nav.openListingByName(page, cardData.name);
          }

          if (!opened) {
            this.state.errors++;
            this.state.errorList.push({ name: cardData.name, message: 'Failed to open listing panel' });
            await this.createErrorStub(repo, cardData.name, category, zipcode, 'Failed to open listing panel');
            return;
          }

          const raw = await extractor.extractFromDetail(page, cardData, zipcode);
          if (!raw) {
            this.state.errors++;
            this.state.errorList.push({ name: cardData.name, message: 'Failed to extract detail data' });
            await this.createErrorStub(repo, cardData.name, category, zipcode, 'Failed to extract detail data');
            await nav.goBackToResults(page, zipcode, category);
            return;
          }

          // Deduplication check
          const dupId = dedup.isDuplicate(raw);
          if (dupId) {
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
      if (process.env.STORAGE_BACKEND === 'postgres') {
        await ScrapeHistoryPostgres.save(this.state);
      } else {
        ScrapeHistory.save(this.state);
      }

      logger.info('Scraper session finished', {
        found: this.state.found,
        saved: this.state.saved,
        skipped: this.state.skipped,
        errors: this.state.errors,
      });
    }
  }
}
