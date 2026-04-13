import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { BrowserManager, randomDelay, withRetry } from './browser.manager';
import { MapsNavigator } from './maps.navigator';
import { MapsExtractor, DetailData } from './maps.extractor';
import { WebsiteExtractor } from './website.extractor';
import { AIService } from '../ai/ai.service';
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

export interface LookupResult {
  status: 'saved' | 'duplicate' | 'not_found' | 'error';
  businessId?: string;   // set when saved or duplicate
  message: string;
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

  /**
   * Look up a single specific business by name + location.
   * Synchronous — awaits completion and returns the result directly.
   * Does NOT use the background queue or update session state.
   */
  async lookup(businessName: string, location: string): Promise<LookupResult> {
    if (this.state.running || this.queue.size > 0) {
      throw new Error('A scraping session is already running. Stop it first.');
    }

    const bm = BrowserManager.getInstance();
    const nav = new MapsNavigator();
    const extractor = new MapsExtractor();
    const repo = getRepository();
    const dedup = new Deduplicator();

    try {
      await bm.launch();
      const page = await bm.newPage();
      await dedup.load(repo);

      // Navigate to a search for this specific business at this location
      const loaded = await nav.navigateToSearch(page, location, businessName);
      if (!loaded) {
        return { status: 'not_found', message: 'No results found — possible CAPTCHA or no listings for this search.' };
      }

      // Grab only the first card — it's the most relevant result
      const cardData = await extractor.extractFromCard(page, 0);
      if (!cardData) {
        return { status: 'not_found', message: 'Could not read the first result card.' };
      }

      // Open the detail panel
      let opened = false;
      if (cardData.googleMapsUrl) {
        opened = await nav.openListingByUrl(page, cardData.googleMapsUrl);
      }
      if (!opened) {
        await nav.goBackToResults(page, location, businessName);
        opened = await nav.openListingByName(page, cardData.name);
      }
      if (!opened) {
        return { status: 'error', message: `Found "${cardData.name}" but could not open its detail panel.` };
      }

      const raw: DetailData | null = await extractor.extractFromDetail(page, cardData, location);
      if (!raw) {
        return { status: 'error', message: `Found "${cardData.name}" but could not extract detail data.` };
      }

      // Dedup check — return existing record if already in DB
      const dupId = dedup.isDuplicate(raw);
      if (dupId) {
        logger.info('Lookup: duplicate found', { name: raw.name, dupId });
        return { status: 'duplicate', businessId: dupId, message: `"${raw.name}" already exists in your database.` };
      }

      // Score, build, save
      const { score, priority } = scoreLead(raw);
      const now = new Date().toISOString();
      const { reviewSnippets, menu, ...rawBusiness } = raw;

      const business: Business = {
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        ...rawBusiness,
        reviewSnippets,
        menu,
        keywords: [],
        keywordCategories: null,
        summary: null,
        insights: null,
        contentBrief: null,
        businessContext: null,
        generatedWebsiteCode: null,
        websitePrompt: null,
        websiteAnalysis: null,
        outreach: null,
        githubUrl: null,
        deployedUrl: null,
        tokensUsed: 0,
        leadStatus: 'new',
        priority,
        priorityScore: score,
        notes: null,
        lastContactedAt: null,
      };

      try {
        await repo.create(business);
      } catch (createErr) {
        const msg = (createErr as Error).message ?? '';
        if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
          const existing = await repo.findDuplicate(raw).catch(() => null);
          return { status: 'duplicate', businessId: existing?.id, message: `"${business.name}" already exists in your database.` };
        }
        throw createErr;
      }
      dedup.register(business);

      // Auto-generate keywords (non-fatal)
      try {
        const { flat: keywords, categories: keywordCategories } = await AIService.generateKeywords(business);
        await repo.update(business.id, { keywords, keywordCategories, updatedAt: new Date().toISOString() });
      } catch (kwErr) {
        logger.warn('Lookup: keyword generation failed (non-fatal)', { error: (kwErr as Error).message });
      }

      logger.info('Lookup: business saved', { name: business.name, priority, score });
      return { status: 'saved', businessId: business.id, message: `"${business.name}" saved successfully.` };

    } catch (err) {
      logger.error('Lookup failed', { error: (err as Error).message });
      return { status: 'error', message: (err as Error).message };
    } finally {
      await bm.close();
    }
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
        reviewSnippets: [],
        menu: [],
        keywords: [],
        keywordCategories: null,
        summary: null,
        insights: null,
        contentBrief: null,
        businessContext: null,
        generatedWebsiteCode: null,
        websitePrompt: null,
        websiteAnalysis: null,
        outreach: null,
        githubUrl: null,
        deployedUrl: null,
        tokensUsed: 0,
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

  /**
   * Look up a specific business by its Google Maps URL.
   * Navigates directly to the listing — no search, no guessing.
   */
  async lookupByMapsUrl(mapsUrl: string): Promise<LookupResult> {
    if (this.state.running || this.queue.size > 0) {
      throw new Error('A scraping session is already running. Stop it first.');
    }

    const bm = BrowserManager.getInstance();
    const nav = new MapsNavigator();
    const extractor = new MapsExtractor();
    const repo = getRepository();
    const dedup = new Deduplicator();

    try {
      await bm.launch();
      const page = await bm.newPage();
      await dedup.load(repo);

      // Navigate directly to the Maps listing URL
      const opened = await nav.openListingByUrl(page, mapsUrl);
      if (!opened) {
        return { status: 'not_found', message: 'Could not load the Google Maps listing. Check the URL and try again.' };
      }

      // Extract a minimal cardData stub — name comes from the detail panel
      const cardData = { name: '', googleMapsUrl: mapsUrl, rating: null, reviewCount: null, category: '', addressSnippet: '', description: null };
      const raw: DetailData | null = await extractor.extractFromDetail(page, cardData, '');
      if (!raw) {
        return { status: 'error', message: 'Could not extract business details from this listing.' };
      }

      // Dedup check
      const dupId = dedup.isDuplicate(raw);
      if (dupId) {
        logger.info('LookupByMapsUrl: duplicate found', { name: raw.name, dupId });
        return { status: 'duplicate', businessId: dupId, message: `"${raw.name}" already exists in your database.` };
      }

      const { score, priority } = scoreLead(raw);
      const now = new Date().toISOString();
      const { reviewSnippets, menu, ...rawBusiness } = raw;

      const business: Business = {
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        ...rawBusiness,
        googleMapsUrl: mapsUrl,
        reviewSnippets,
        menu,
        keywords: [],
        keywordCategories: null,
        summary: null,
        insights: null,
        contentBrief: null,
        businessContext: null,
        generatedWebsiteCode: null,
        websitePrompt: null,
        websiteAnalysis: null,
        outreach: null,
        githubUrl: null,
        deployedUrl: null,
        tokensUsed: 0,
        leadStatus: 'new',
        priority,
        priorityScore: score,
        notes: null,
        lastContactedAt: null,
      };

      try {
        await repo.create(business);
      } catch (createErr) {
        const msg = (createErr as Error).message ?? '';
        if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
          logger.info('LookupByMapsUrl: DB unique constraint — already exists', { name: business.name });
          const existing = await repo.findDuplicate(raw).catch(() => null);
          return { status: 'duplicate', businessId: existing?.id, message: `"${business.name}" already exists in your database.` };
        }
        throw createErr;
      }
      dedup.register(business);

      // Auto-generate keywords (non-fatal)
      try {
        const { flat: keywords, categories: keywordCategories, tokensUsed: kwTokens } = await AIService.generateKeywords(business);
        await repo.update(business.id, { keywords, keywordCategories, tokensUsed: kwTokens, updatedAt: new Date().toISOString() });
      } catch (kwErr) {
        logger.warn('LookupByMapsUrl: keyword generation failed (non-fatal)', { error: (kwErr as Error).message });
      }

      logger.info('LookupByMapsUrl: business saved', { name: business.name, priority, score });
      return { status: 'saved', businessId: business.id, message: `"${business.name}" saved successfully.` };

    } catch (err) {
      logger.error('LookupByMapsUrl failed', { error: (err as Error).message });
      return { status: 'error', message: (err as Error).message };
    } finally {
      await bm.close();
    }
  }

  /**
   * Import a business from its existing website URL.
   * Fetches the page, extracts business info, saves a profile, then runs full AI analysis.
   */
  async importFromUrl(websiteUrl: string): Promise<LookupResult> {
    const extractor = new WebsiteExtractor();
    const repo = getRepository();
    const dedup = new Deduplicator();

    try {
      await dedup.load(repo);

      const extracted = await extractor.extract(websiteUrl);
      if (!extracted) {
        return { status: 'error', message: 'Could not fetch the website. Check the URL and try again.' };
      }

      const name = extracted.name ?? new URL(websiteUrl).hostname.replace(/^www\./, '');
      const address = extracted.address ?? '';

      // Dedup check by name + address
      const dupId = dedup.isDuplicate({ name, address, phone: extracted.phone ?? null });
      if (dupId) {
        return { status: 'duplicate', businessId: dupId, message: `"${name}" already exists in your database.` };
      }

      const raw = {
        name,
        phone: extracted.phone ?? null,
        address,
        zipcode: '',
        category: extracted.category ?? 'business',
        description: extracted.description ?? null,
        website: true,
        websiteUrl,
      };

      const { score, priority } = scoreLead(raw);
      const now = new Date().toISOString();

      const business: Business = {
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        ...raw,
        rating: null,
        reviewCount: null,
        googleMapsUrl: null,
        reviewSnippets: [],
        menu: [],
        keywords: [],
        keywordCategories: null,
        summary: null,
        insights: null,
        contentBrief: null,
        businessContext: null,
        generatedWebsiteCode: null,
        websitePrompt: null,
        websiteAnalysis: null,
        outreach: null,
        githubUrl: null,
        deployedUrl: null,
        tokensUsed: 0,
        leadStatus: 'new',
        priority,
        priorityScore: score,
        notes: null,
        lastContactedAt: null,
      };

      await repo.create(business);
      dedup.register(business);

      // Run full AI analysis (keywords → summary → insights → content brief)
      try {
        await AIService.analyzeAll(business.id);
      } catch (aiErr) {
        logger.warn('importFromUrl: AI analysis failed (non-fatal)', { error: (aiErr as Error).message });
      }

      logger.info('importFromUrl: business saved', { name, websiteUrl, priority, score });
      return { status: 'saved', businessId: business.id, message: `"${name}" saved and analysed successfully.` };

    } catch (err) {
      logger.error('importFromUrl failed', { error: (err as Error).message });
      return { status: 'error', message: (err as Error).message };
    }
  }

  stop(): void {
    if (!this.state.running) return;
    this.stopRequested = true;
    this.queue.clear();
    this.batchPending = [];
    logger.info('Scraper stop requested — closing browser immediately');
    // Close the browser immediately so any in-flight page.goto / waitForSelector
    // throws and the runSession loop exits instead of waiting for the current
    // listing to finish (which can take 10-30s with retries + delays).
    BrowserManager.getInstance().close().catch(() => {});
  }

  private async runSession(zipcode: string, category: string, maxResults: number): Promise<void> {
    const bm = BrowserManager.getInstance();
    const nav = new MapsNavigator();
    const extractor = new MapsExtractor();
    const repo = getRepository();
    const dedup = new Deduplicator();
    let sessionTokensUsed = 0;

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

          const raw: DetailData | null = await extractor.extractFromDetail(page, cardData, zipcode);
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
          const { reviewSnippets, menu, ...rawBusiness } = raw;

          const business: Business = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            ...rawBusiness,
            reviewSnippets,
            menu,
            keywords: [],
            keywordCategories: null,
            summary: null,
            insights: null,
            contentBrief: null,
            businessContext: null,
            generatedWebsiteCode: null,
            websitePrompt: null,
            websiteAnalysis: null,
            outreach: null,
            githubUrl: null,
            deployedUrl: null,
            tokensUsed: 0,
            leadStatus: 'new',
            priority,
            priorityScore: score,
            notes: null,
            lastContactedAt: null,
          };

          await repo.create(business);
          dedup.register(business);

          // Auto-generate keywords at scrape time — reviewSnippets already stored on business record
          try {
            const { flat: keywords, categories: keywordCategories, tokensUsed: kwTokens } = await AIService.generateKeywords(business);
            await repo.update(business.id, { keywords, keywordCategories, tokensUsed: business.tokensUsed + kwTokens, updatedAt: new Date().toISOString() });
            sessionTokensUsed += kwTokens;
            this.state.tokensUsed = sessionTokensUsed;
            logger.debug('Keywords auto-generated at scrape time', { name: business.name, count: keywords.length, tokens: kwTokens });
          } catch (kwErr) {
            logger.warn('Keyword generation failed (non-fatal)', { name: business.name, error: (kwErr as Error).message });
          }

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
