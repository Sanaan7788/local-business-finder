import { LLMService } from '../llm/llm.service';
import { LLMImageInput } from '../llm/llm.interface';
import { Business, Insights, ContentBrief, Keywords, MenuSection } from '../../types/business.types';
import { getRepository } from '../../data/repository.factory';
import { NotFoundError, UnprocessableError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { buildKeywordsPrompt, parseKeywords } from './prompts/keywords.prompt';
import { buildSummaryPrompt, parseSummary } from './prompts/summary.prompt';
import { buildInsightsPrompt, parseInsights } from './prompts/insights.prompt';
import { buildBusinessContextPrompt, parseBusinessContext } from './prompts/business-context.prompt';
import { buildContentBriefPrompt, parseContentBrief } from './prompts/content-brief.prompt';
import { buildOutreachEmailPrompt, parseOutreachEmail } from './prompts/outreach-email.prompt';
import { buildMenuExtractionPrompt, parseMenuExtraction } from './prompts/menu-extraction.prompt';

// ---------------------------------------------------------------------------
// AIService
//
// Runs LLM-powered enrichment on a business profile. Each generate* method is
// pure (returns results + tokens used); callers persist. analyzeAll() runs the
// full chain and persists after each step so a failure keeps earlier results.
// ---------------------------------------------------------------------------

export const AIService = {

  async generateKeywords(business: Business): Promise<{ flat: string[]; categories: Keywords; tokensUsed: number }> {
    logger.debug('AIService: generating keywords', { id: business.id, name: business.name });
    const prompt = buildKeywordsPrompt(business);
    const response = await LLMService.complete('keywords', { ...prompt, temperature: 0.4, maxTokens: 600 });
    const result = parseKeywords(response.content);
    return { ...result, tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateSummary(business: Business): Promise<{ summary: string; tokensUsed: number }> {
    logger.debug('AIService: generating summary', { id: business.id, name: business.name });
    const prompt = buildSummaryPrompt(business);
    const response = await LLMService.complete('summary', { ...prompt, temperature: 0.6, maxTokens: 256 });
    return { summary: parseSummary(response.content), tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateInsights(business: Business): Promise<{ insights: Insights; tokensUsed: number }> {
    logger.debug('AIService: generating insights', { id: business.id, name: business.name });
    const prompt = buildInsightsPrompt(business);
    const response = await LLMService.complete('insights', { ...prompt, temperature: 0.5, maxTokens: 600 });
    return { insights: parseInsights(response.content), tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateBusinessContext(business: Business): Promise<{ businessContext: string; tokensUsed: number }> {
    logger.debug('AIService: generating business context', { id: business.id, category: business.category });
    const prompt = buildBusinessContextPrompt(business);
    const response = await LLMService.complete('businessContext', { ...prompt, temperature: 0.5, maxTokens: 800 });
    return { businessContext: parseBusinessContext(response.content), tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateContentBrief(business: Business): Promise<{ contentBrief: ContentBrief; tokensUsed: number }> {
    logger.debug('AIService: generating content brief', { id: business.id, name: business.name });
    const prompt = buildContentBriefPrompt(business);
    const response = await LLMService.complete('contentBrief', { ...prompt, temperature: 0.5, maxTokens: 2048 });
    return { contentBrief: parseContentBrief(response.content), tokensUsed: response.tokensUsed ?? 0 };
  },

  /** Runs keywords → summary → business context → insights → content brief and persists each step. */
  async analyzeAll(id: string): Promise<Business> {
    const repo = getRepository();
    let business = await repo.findById(id);
    if (!business) throw new NotFoundError('Business', id);

    logger.info('AIService: starting full analysis', { id, name: business.name });
    let sessionTokens = 0;

    const { flat: keywords, categories: keywordCategories, tokensUsed: t1 } = await AIService.generateKeywords(business);
    sessionTokens += t1;
    business = await repo.update(id, { keywords, keywordCategories, tokensUsed: business.tokensUsed + t1 });

    const { summary, tokensUsed: t2 } = await AIService.generateSummary(business);
    sessionTokens += t2;
    business = await repo.update(id, { summary, tokensUsed: business.tokensUsed + t2 });

    const { businessContext, tokensUsed: t3 } = await AIService.generateBusinessContext(business);
    sessionTokens += t3;
    business = await repo.update(id, { businessContext, tokensUsed: business.tokensUsed + t3 });

    const { insights, tokensUsed: t4 } = await AIService.generateInsights(business);
    sessionTokens += t4;
    business = await repo.update(id, { insights, tokensUsed: business.tokensUsed + t4 });

    const { contentBrief, tokensUsed: t5 } = await AIService.generateContentBrief(business);
    sessionTokens += t5;
    business = await repo.update(id, { contentBrief, tokensUsed: business.tokensUsed + t5 });

    logger.info('AIService: full analysis complete', { id, name: business.name, totalTokens: sessionTokens });
    return business;
  },

  async generateOutreachEmail(business: Business): Promise<{ subject: string; body: string; tokensUsed: number }> {
    if (!business.websiteAnalysis?.improvements?.length) {
      throw new UnprocessableError('Run website analysis first to generate improvement opportunities.');
    }
    logger.debug('AIService: generating outreach email', { id: business.id, name: business.name });
    const prompt = buildOutreachEmailPrompt(business);
    const response = await LLMService.complete('outreachEmail', { ...prompt, temperature: 0.7, maxTokens: 600 });
    return { ...parseOutreachEmail(response.content), tokensUsed: response.tokensUsed ?? 0 };
  },

  /**
   * Extract menu sections from photos (Claude vision) and merge them into the
   * existing menu, skipping sections that already exist by name.
   */
  async extractMenuFromImages(
    business: Business,
    images: LLMImageInput[],
  ): Promise<{ menu: MenuSection[]; extracted: MenuSection[]; tokensUsed: number }> {
    logger.debug('AIService: extracting menu from images', { id: business.id, images: images.length });
    const prompt = buildMenuExtractionPrompt(business.name, images.length);
    const response = await LLMService.complete(
      'menuExtraction',
      { ...prompt, images, temperature: 0.1, maxTokens: 4096 },
      { provider: 'claude' },
    );

    let extracted: MenuSection[];
    try {
      extracted = parseMenuExtraction(response.content);
    } catch {
      throw new UnprocessableError('Could not extract a menu from these images. Try clearer photos.');
    }
    if (extracted.length === 0) {
      throw new UnprocessableError('No menu items found in the images. Try clearer or closer photos.');
    }

    const existingNames = new Set(business.menu.map((s) => s.section.toLowerCase()));
    const menu = [...business.menu, ...extracted.filter((s) => !existingNames.has(s.section.toLowerCase()))];
    return { menu, extracted, tokensUsed: response.tokensUsed ?? 0 };
  },
};
