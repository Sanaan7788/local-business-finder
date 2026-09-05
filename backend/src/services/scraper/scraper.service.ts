import PQueue from 'p-queue';
import type { Page } from 'playwright';
import { BrowserManager, randomDelay, withRetry } from './browser.manager';
import { MapsNavigator } from './maps.navigator';
import { MapsExtractor, CardData, DetailData } from './maps.extractor';
import { WebsiteExtractor } from './website.extractor';
import { AIService } from '../ai/ai.service';
import { ScraperState, INITIAL_STATE } from './scraper.types';
import { ScrapeHistory } from './scrape.history';
import { Deduplicator } from '../../utils/deduplicator';
import { getRepository } from '../../data/repository.factory';
import { IBusinessRepository } from '../../data/repository.interface';
import { buildBusiness } from '../lead/business.factory';
import { scoreLead } from '../lead/lead.scorer';
import { ConflictError, NotFoundError, UnprocessableError, UpstreamError, isUniqueViolation } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { Business, RawBusiness } from '../../types/business.types';

// ---------------------------------------------------------------------------
// ScraperService — singleton orchestrating every browser-driven flow.
//
// Background:  start() / startBatch() queue sessions that run one at a time
//              (PQueue concurrency 1) and report progress through getState().
// Synchronous: lookupByMapsUrl() / rescrape() await completion. They take the
//              same exclusive lock, so only one browser flow runs at a time.
// importFromUrl() needs no browser (plain fetch + LLM) and runs unlocked.
// ---------------------------------------------------------------------------

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

interface SessionContext {
  page: Page;
  nav: MapsNavigator;
  extractor: MapsExtractor;
  repo: IBusinessRepository;
  dedup: Deduplicator;
  zipcode: string;
  category: string;
}

type CreateOutcome = { created: true } | { created: false; existingId: string | null };

const BUSY_MESSAGE = 'A scraping session is already running. Stop it first.';
const noop = () => undefined;

export class ScraperService {
  private static _instance: ScraperService | null = null;

  private state: ScraperState = { ...INITIAL_STATE };
  private readonly queue = new PQueue({ concurrency: 1 });
  private stopRequested = false;
  private exclusive = false; // a synchronous lookup / rescrape owns the browser

  // Batch mode tracking
  private batchPending: BatchJob[] = [];
  private batchTotal = 0;
  private batchCompleted = 0;

  private constructor() {}

  static getInstance(): ScraperService {
    return (ScraperService._instance ??= new ScraperService());
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

  // ---- Concurrency guard --------------------------------------------------

  private isBusy(): boolean {
    return this.exclusive || this.state.running || this.queue.size > 0 || this.queue.pending > 0;
  }

  private assertIdle(): void {
    if (this.isBusy()) throw new ConflictError(BUSY_MESSAGE);
  }

  /** Run a synchronous browser flow while holding the exclusive lock. */
  private async withExclusive<T>(fn: () => Promise<T>): Promise<T> {
    this.assertIdle();
    this.exclusive = true;
    try {
      return await fn();
    } finally {
      this.exclusive = false;
    }
  }

  // ---- Background sessions ------------------------------------------------

  start(zipcode: string, category = 'businesses', maxResults = 50): void {
    this.assertIdle();
    this.stopRequested = false;
    this.batchTotal = 1;
    this.batchCompleted = 0;
    this.batchPending = [];
    this.state = this.freshState(zipcode, category, maxResults);

    logger.info('Scraper started', { zipcode, category, maxResults });
    this.enqueue(() => this.runSession(zipcode, category, maxResults));
  }

  /** Queue multiple category searches for the same location. */
  startBatch(zipcode: string, categories: string[], maxResults = 20): void {
    this.assertIdle();
    this.stopRequested = false;
    const jobs: BatchJob[] = categories.map((category) => ({ zipcode, category, maxResults }));
    this.batchTotal = jobs.length;
    this.batchCompleted = 0;
    this.batchPending = jobs.slice(1);
    this.state = this.freshState(zipcode, jobs[0].category, maxResults);

    logger.info('Batch scraper started', { zipcode, categories: categories.length, maxResults });
    for (const job of jobs) this.enqueue(() => this.runBatchJob(job));
  }

  stop(): void {
    if (!this.state.running) return;
    this.stopRequested = true;
    this.queue.clear();
    this.batchPending = [];
    logger.info('Scraper stop requested — closing browser');
    // Closing the browser makes any in-flight page action throw, so the session
    // loop exits now instead of after the current listing (10-30 s with retries).
    BrowserManager.getInstance().close().catch(noop);
  }

  private freshState(zipcode: string, category: string, maxResults: number): ScraperState {
    return { ...INITIAL_STATE, running: true, zipcode, category, maxResults, startedAt: new Date().toISOString() };
  }

  private enqueue(job: () => Promise<void>): void {
    this.queue
      .add(job)
      .catch((err) => logger.error('Queued scrape job failed', { error: (err as Error).message }));
  }

  private async runBatchJob(job: BatchJob): Promise<void> {
    if (this.stopRequested) return;
    this.state = this.freshState(job.zipcode, job.category, job.maxResults);
    this.batchPending = this.batchPending.filter(
      (j) => !(j.zipcode === job.zipcode && j.category === job.category),
    );

    await this.runSession(job.zipcode, job.category, job.maxResults);

    this.batchCompleted++;
    if (this.queue.size === 0) this.batchPending = [];
  }

  private async runSession(zipcode: string, category: string, maxResults: number): Promise<void> {
    const bm = BrowserManager.getInstance();
    const repo = getRepository();
    const dedup = new Deduplicator();
    let page: Page | null = null;

    try {
      await bm.launch();
      page = await bm.newPage();
      await dedup.load(repo);

      const ctx: SessionContext = {
        page, repo, dedup, zipcode, category,
        nav: new MapsNavigator(),
        extractor: new MapsExtractor(),
      };

      const loaded = await ctx.nav.navigateToSearch(page, zipcode, category);
      if (!loaded) {
        logger.warn('No results loaded — possible CAPTCHA or no listings found');
        return;
      }

      const totalCards = await ctx.nav.scrollResultsToLoad(page, maxResults);
      this.state.found = totalCards;

      // Pre-collect every card first: opening a listing re-renders the list and
      // shifts card indices, so each listing is opened by URL/name afterwards.
      const cards: CardData[] = [];
      for (let i = 0; i < Math.min(totalCards, maxResults); i++) {
        const card = await ctx.extractor.extractFromCard(page, i);
        if (card) {
          cards.push(card);
          this.state.foundNames.push(card.name);
        }
      }
      logger.info('Card data pre-collected', { count: cards.length });

      for (const card of cards) {
        if (this.stopRequested) break;
        try {
          await withRetry(() => this.processCard(ctx, card));
        } catch (err) {
          if (this.stopRequested) break;
          // One listing failing all retries must not abort the whole session
          this.state.errors++;
          this.state.errorList.push({ name: card.name, message: (err as Error).message });
          logger.warn('Listing failed after retries', { name: card.name, error: (err as Error).message });
        }
      }
    } catch (err) {
      logger.error('Scraper session failed', { error: (err as Error).message });
      this.state.errors++;
      this.state.errorList.push({ name: 'session', message: (err as Error).message });
    } finally {
      if (page) await page.close().catch(noop);
      await bm.close();
      this.state.running = false;
      this.state.finishedAt = new Date().toISOString();

      try {
        await ScrapeHistory.save(this.state);
      } catch (err) {
        logger.error('Failed to persist scrape session', { error: (err as Error).message });
      }

      logger.info('Scraper session finished', {
        found: this.state.found,
        saved: this.state.saved,
        skipped: this.state.skipped,
        errors: this.state.errors,
      });
    }
  }

  /** Open one listing, extract it, dedupe, save, and auto-generate keywords. */
  private async processCard(ctx: SessionContext, card: CardData): Promise<void> {
    if (this.stopRequested) return;
    const { page, nav, extractor, repo, dedup, zipcode, category } = ctx;

    // Prefer direct URL navigation; fall back to clicking the card by name
    let opened = card.googleMapsUrl ? await nav.openListingByUrl(page, card.googleMapsUrl) : false;
    if (!opened) {
      await nav.goBackToResults(page, zipcode, category);
      opened = await nav.openListingByName(page, card.name);
    }
    if (!opened) {
      await this.recordListingError(repo, card.name, category, zipcode, 'Failed to open listing panel');
      return;
    }

    const raw = await extractor.extractFromDetail(page, card, zipcode);
    if (!raw) {
      await this.recordListingError(repo, card.name, category, zipcode, 'Failed to extract detail data');
      await nav.goBackToResults(page, zipcode, category);
      return;
    }

    const dupId = dedup.isDuplicate(raw);
    if (dupId) {
      this.recordSkip(raw, dupId, dedup);
      return;
    }

    const { reviewSnippets, menu, ...rawBusiness } = raw;
    const business = buildBusiness(rawBusiness, { reviewSnippets, menu });

    const outcome = await this.createUnlessDuplicate(repo, business, raw);
    if (!outcome.created) {
      this.recordSkip(raw, outcome.existingId ?? 'unknown', dedup);
      return;
    }
    dedup.register(business);

    this.state.tokensUsed += await this.generateKeywordsNonFatal(repo, business);

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

    logger.info('Business saved', { name: business.name, priority: business.priority, score: business.priorityScore });
    await randomDelay();
  }

  // ---- Synchronous flows --------------------------------------------------

  /** Look up one business by its Google Maps URL — direct navigation, no search. */
  async lookupByMapsUrl(mapsUrl: string): Promise<LookupResult> {
    return this.withExclusive(async () => {
      const bm = BrowserManager.getInstance();
      const nav = new MapsNavigator();
      const extractor = new MapsExtractor();
      const repo = getRepository();
      const dedup = new Deduplicator();
      let page: Page | null = null;

      try {
        await bm.launch();
        page = await bm.newPage();
        await dedup.load(repo);

        const opened = await nav.openListingByUrl(page, mapsUrl);
        if (!opened) {
          return { status: 'not_found', message: 'Could not load the Google Maps listing. Check the URL and try again.' };
        }

        // Everything, including the name, comes from the detail panel
        const card: CardData = {
          name: '', googleMapsUrl: mapsUrl, rating: null, reviewCount: null,
          category: '', addressSnippet: '', description: null,
        };
        const raw = await extractor.extractFromDetail(page, card, '');
        if (!raw) return { status: 'error', message: 'Could not extract business details from this listing.' };

        const dupId = dedup.isDuplicate(raw);
        if (dupId) {
          logger.info('LookupByMapsUrl: duplicate found', { name: raw.name, dupId });
          return this.duplicateResult(raw.name, dupId);
        }

        const { reviewSnippets, menu, ...rawBusiness } = raw;
        const business = buildBusiness(rawBusiness, { reviewSnippets, menu, googleMapsUrl: mapsUrl });

        const outcome = await this.createUnlessDuplicate(repo, business, raw);
        if (!outcome.created) return this.duplicateResult(business.name, outcome.existingId);
        dedup.register(business);

        await this.generateKeywordsNonFatal(repo, business);

        logger.info('LookupByMapsUrl: business saved', { name: business.name, priority: business.priority });
        return { status: 'saved', businessId: business.id, message: `"${business.name}" saved successfully.` };
      } catch (err) {
        logger.error('LookupByMapsUrl failed', { error: (err as Error).message });
        return { status: 'error', message: (err as Error).message };
      } finally {
        if (page) await page.close().catch(noop);
        await bm.close();
      }
    });
  }

  /**
   * Re-scrape an existing business in place from its stored Google Maps URL.
   * Refreshes the discovered fields, review snippets and menu; preserves all
   * AI outputs, CRM fields and generated content.
   */
  async rescrape(businessId: string): Promise<{ updated: Business }> {
    return this.withExclusive(async () => {
      const repo = getRepository();
      const existing = await repo.findById(businessId);
      if (!existing) throw new NotFoundError('Business', businessId);
      if (!existing.googleMapsUrl) throw new UnprocessableError('This business has no Google Maps URL — cannot re-scrape.');

      const bm = BrowserManager.getInstance();
      const nav = new MapsNavigator();
      const extractor = new MapsExtractor();
      let page: Page | null = null;

      try {
        await bm.launch();
        page = await bm.newPage();

        const opened = await nav.openListingByUrl(page, existing.googleMapsUrl);
        if (!opened) throw new UpstreamError('Could not load the Google Maps listing.');

        const card: CardData = {
          name: existing.name,
          googleMapsUrl: existing.googleMapsUrl,
          rating: existing.rating,
          reviewCount: existing.reviewCount,
          category: existing.category,
          addressSnippet: existing.address,
          description: existing.description,
        };
        const raw = await extractor.extractFromDetail(page, card, existing.zipcode);
        if (!raw) throw new UpstreamError('Could not extract business details from this listing.');

        const { score, priority } = scoreLead(raw);
        const updated = await repo.update(businessId, {
          name:           raw.name || existing.name,
          phone:          raw.phone ?? existing.phone,
          address:        raw.address || existing.address,
          zipcode:        raw.zipcode || existing.zipcode,
          category:       raw.category || existing.category,
          description:    raw.description ?? existing.description,
          websiteUrl:     raw.websiteUrl ?? existing.websiteUrl,
          website:        raw.website,
          rating:         raw.rating ?? existing.rating,
          reviewCount:    raw.reviewCount ?? existing.reviewCount,
          reviewSnippets: raw.reviewSnippets,
          menu:           raw.menu,
          priorityScore:  score,
          priority,
        });

        logger.info('Rescrape complete', { id: businessId, name: updated.name, menuSections: raw.menu.length });
        return { updated };
      } finally {
        if (page) await page.close().catch(noop);
        await bm.close();
      }
    });
  }

  /**
   * Import a business from its existing website: fetch the page, extract the
   * basics, save a profile, then run the full AI analysis.
   */
  async importFromUrl(websiteUrl: string): Promise<LookupResult> {
    const repo = getRepository();
    const dedup = new Deduplicator();

    try {
      await dedup.load(repo);

      const extracted = await new WebsiteExtractor().extract(websiteUrl);
      if (!extracted) {
        return { status: 'error', message: 'Could not fetch the website. Check the URL and try again.' };
      }

      const name = extracted.name ?? new URL(websiteUrl).hostname.replace(/^www\./, '');
      const raw: RawBusiness = {
        name,
        phone:         extracted.phone ?? null,
        address:       extracted.address ?? '',
        zipcode:       '',
        category:      extracted.category ?? 'business',
        description:   extracted.description ?? null,
        website:       true,
        websiteUrl,
        rating:        null,
        reviewCount:   null,
        googleMapsUrl: null,
      };

      const dupId = dedup.isDuplicate(raw);
      if (dupId) return this.duplicateResult(name, dupId);

      const business = buildBusiness(raw);
      const outcome = await this.createUnlessDuplicate(repo, business, raw);
      if (!outcome.created) return this.duplicateResult(name, outcome.existingId);
      dedup.register(business);

      try {
        await AIService.analyzeAll(business.id);
      } catch (aiErr) {
        logger.warn('importFromUrl: AI analysis failed (non-fatal)', { error: (aiErr as Error).message });
      }

      logger.info('importFromUrl: business saved', { name, websiteUrl, priority: business.priority });
      return { status: 'saved', businessId: business.id, message: `"${name}" saved and analysed successfully.` };
    } catch (err) {
      logger.error('importFromUrl failed', { error: (err as Error).message });
      return { status: 'error', message: (err as Error).message };
    }
  }

  // ---- Shared helpers -----------------------------------------------------

  /** Insert, treating a unique-constraint violation as "already exists". */
  private async createUnlessDuplicate(
    repo: IBusinessRepository,
    business: Business,
    raw: Pick<RawBusiness, 'name' | 'address' | 'phone'>,
  ): Promise<CreateOutcome> {
    try {
      await repo.create(business);
      return { created: true };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      logger.info('Insert hit unique constraint — business already exists', { name: business.name });
      const existingId = await repo.findDuplicateId(raw).catch(() => null);
      return { created: false, existingId };
    }
  }

  private duplicateResult(name: string, existingId: string | null): LookupResult {
    return {
      status: 'duplicate',
      businessId: existingId ?? undefined,
      message: `"${name}" already exists in your database.`,
    };
  }

  private recordSkip(raw: DetailData, existingId: string, dedup: Deduplicator): void {
    const normalizedPhone = raw.phone?.replace(/\D/g, '') ?? '';
    const reason = normalizedPhone && dedup.hasPhone(normalizedPhone) ? 'phone' : 'name+address';
    logger.debug('Skipping duplicate', { name: raw.name, existingId });
    this.state.skipped++;
    this.state.skippedList.push({ name: raw.name, address: raw.address, reason, existingId });
  }

  private async recordListingError(
    repo: IBusinessRepository,
    name: string,
    category: string,
    zipcode: string,
    message: string,
  ): Promise<void> {
    this.state.errors++;
    this.state.errorList.push({ name, message });
    await this.createErrorStub(repo, name, category, zipcode, message);
  }

  /** Minimal record for a listing that could not be scraped, so the name is not lost. */
  private async createErrorStub(
    repo: IBusinessRepository,
    name: string,
    category: string,
    zipcode: string,
    errorMsg: string,
  ): Promise<void> {
    try {
      const stub = buildBusiness(
        {
          name, zipcode, category,
          phone: null, address: '', description: null, website: false, websiteUrl: null,
          rating: null, reviewCount: null, googleMapsUrl: null,
        },
        { notes: `Scrape error: ${errorMsg}` },
      );
      // Score only on what we actually know; unknown review data must not inflate priority
      const { score, priority } = scoreLead({ name, category, zipcode, website: false });
      await repo.create({ ...stub, priorityScore: score, priority });
      logger.debug('Created error stub', { name });
    } catch (err) {
      logger.warn('Failed to create error stub', { name, error: (err as Error).message });
    }
  }

  /** Keyword generation at save time is best-effort; returns tokens used. */
  private async generateKeywordsNonFatal(repo: IBusinessRepository, business: Business): Promise<number> {
    try {
      const { flat: keywords, categories: keywordCategories, tokensUsed } = await AIService.generateKeywords(business);
      await repo.update(business.id, { keywords, keywordCategories, tokensUsed: business.tokensUsed + tokensUsed });
      logger.debug('Keywords auto-generated', { name: business.name, count: keywords.length, tokens: tokensUsed });
      return tokensUsed;
    } catch (err) {
      logger.warn('Keyword generation failed (non-fatal)', { name: business.name, error: (err as Error).message });
      return 0;
    }
  }
}
