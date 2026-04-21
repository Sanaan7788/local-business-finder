import { LLMService } from '../llm/llm.service';
import { Business, Insights, ContentBrief, Keywords } from '../../types/business.types';
import { getRepository } from '../../data/repository.factory';
import { logger } from '../../utils/logger';
import { buildKeywordsPrompt, parseKeywords } from './prompts/keywords.prompt';
import { buildSummaryPrompt, parseSummary } from './prompts/summary.prompt';
import { buildInsightsPrompt, parseInsights } from './prompts/insights.prompt';
import { buildBusinessContextPrompt, parseBusinessContext } from './prompts/business-context.prompt';
import { buildContentBriefPrompt, parseContentBrief } from './prompts/content-brief.prompt';
import { buildOutreachEmailPrompt, parseOutreachEmail } from './prompts/outreach-email.prompt';

// ---------------------------------------------------------------------------
// AIService
//
// Runs LLM-powered enrichment on a business profile.
// Each method is independent — call them individually or via analyzeAll().
//
// All prompts are pure functions (buildXxxPrompt) — testable without an API call.
// Parsers extract structured data from the raw LLM response.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

export const AIService = {

  async generateKeywords(business: Business): Promise<{ flat: string[]; categories: Keywords; tokensUsed: number }> {
    logger.debug('AIService: generating keywords', { id: business.id, name: business.name });
    const prompt = buildKeywordsPrompt(business);
    const response = await LLMService.complete('keywords', { ...prompt, temperature: 0.4, maxTokens: 600 });
    const result = parseKeywords(response.content);
    logger.debug('AIService: keywords generated', { id: business.id, total: result.flat.length, tokens: response.tokensUsed });
    return { ...result, tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateSummary(business: Business): Promise<{ summary: string; tokensUsed: number }> {
    logger.debug('AIService: generating summary', { id: business.id, name: business.name });
    const prompt = buildSummaryPrompt(business);
    const response = await LLMService.complete('summary', { ...prompt, temperature: 0.6, maxTokens: 256 });
    const summary = parseSummary(response.content);
    logger.debug('AIService: summary generated', { id: business.id, tokens: response.tokensUsed });
    return { summary, tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateInsights(business: Business): Promise<{ insights: Insights; tokensUsed: number }> {
    logger.debug('AIService: generating insights', { id: business.id, name: business.name });
    const prompt = buildInsightsPrompt(business);
    const response = await LLMService.complete('insights', { ...prompt, temperature: 0.5, maxTokens: 600 });
    const insights = parseInsights(response.content);
    logger.debug('AIService: insights generated', { id: business.id, opportunities: insights.opportunities.length, tokens: response.tokensUsed });
    return { insights, tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateBusinessContext(business: Business): Promise<{ businessContext: string; tokensUsed: number }> {
    logger.debug('AIService: generating business context', { id: business.id, category: business.category });
    const prompt = buildBusinessContextPrompt(business);
    const response = await LLMService.complete('businessContext', { ...prompt, temperature: 0.5, maxTokens: 800 });
    const businessContext = parseBusinessContext(response.content);
    logger.debug('AIService: business context generated', { id: business.id, tokens: response.tokensUsed });
    return { businessContext, tokensUsed: response.tokensUsed ?? 0 };
  },

  async generateContentBrief(business: Business): Promise<{ contentBrief: ContentBrief; tokensUsed: number }> {
    logger.debug('AIService: generating content brief', { id: business.id, name: business.name });
    const prompt = buildContentBriefPrompt(business);
    const response = await LLMService.complete('contentBrief', { ...prompt, temperature: 0.5, maxTokens: 2048 });
    const contentBrief = parseContentBrief(response.content);
    logger.debug('AIService: content brief generated', { id: business.id, tokens: response.tokensUsed });
    return { contentBrief, tokensUsed: response.tokensUsed ?? 0 };
  },

  // Runs all enrichments in sequence and persists results to the repository.
  async analyzeAll(id: string): Promise<Business> {
    const repo = getRepository();
    let business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    logger.info('AIService: starting full analysis', { id, name: business.name });
    let sessionTokens = 0;

    // Step 1: keywords
    const { flat: keywords, categories: keywordCategories, tokensUsed: t1 } = await AIService.generateKeywords(business);
    sessionTokens += t1;
    business = await repo.update(id, { keywords, keywordCategories, tokensUsed: business.tokensUsed + sessionTokens, updatedAt: new Date().toISOString() });

    // Step 2: summary
    const { summary, tokensUsed: t2 } = await AIService.generateSummary(business);
    sessionTokens += t2;
    business = await repo.update(id, { summary, tokensUsed: business.tokensUsed + t2, updatedAt: new Date().toISOString() });

    // Step 3: business context
    const { businessContext, tokensUsed: t3 } = await AIService.generateBusinessContext(business);
    sessionTokens += t3;
    business = await repo.update(id, { businessContext, tokensUsed: business.tokensUsed + t3, updatedAt: new Date().toISOString() });

    // Step 4: insights
    const { insights, tokensUsed: t4 } = await AIService.generateInsights(business);
    sessionTokens += t4;
    business = await repo.update(id, { insights, tokensUsed: business.tokensUsed + t4, updatedAt: new Date().toISOString() });

    // Step 5: content brief
    const { contentBrief, tokensUsed: t5 } = await AIService.generateContentBrief(business);
    sessionTokens += t5;
    business = await repo.update(id, { contentBrief, tokensUsed: business.tokensUsed + t5, updatedAt: new Date().toISOString() });

    logger.info('AIService: full analysis complete', { id, name: business.name, totalTokens: sessionTokens });
    return business;
  },

  async generateOutreachEmail(business: Business): Promise<{ subject: string; body: string; tokensUsed: number }> {
    if (!business.websiteAnalysis?.improvements?.length) {
      throw new Error('Website analysis with improvements is required before generating an outreach email');
    }
    logger.debug('AIService: generating outreach email', { id: business.id, name: business.name });
    const prompt = buildOutreachEmailPrompt(business);
    const response = await LLMService.complete('outreachEmail', { ...prompt, temperature: 0.7, maxTokens: 600 });
    const { subject, body } = parseOutreachEmail(response.content);
    logger.debug('AIService: outreach email generated', { id: business.id, tokens: response.tokensUsed });
    return { subject, body, tokensUsed: response.tokensUsed ?? 0 };
  },

  // Returns tokens used — for callers that track externally (e.g. scraper)
  async generateKeywordsForScraper(business: Business): Promise<{ flat: string[]; categories: Keywords; tokensUsed: number }> {
    return AIService.generateKeywords(business);
  },
};
