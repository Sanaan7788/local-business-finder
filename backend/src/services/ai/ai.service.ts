import { LLMService } from '../llm/llm.service';
import { Business, Insights, ContentBrief, Keywords } from '../../types/business.types';
import { getRepository } from '../../data/repository.factory';
import { logger } from '../../utils/logger';

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
// Keywords (categorised)
// ---------------------------------------------------------------------------

function buildKeywordsPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  // Use stored review snippets — available even when regenerating later
  const snippets = business.reviewSnippets ?? [];

  return {
    systemPrompt:
      'You are a local SEO and website copywriter. Generate categorised keywords for a local business. ' +
      'Split them into four groups with distinct purposes: ' +
      'serviceKeywords (specific services/products offered), ' +
      'locationKeywords (city, neighborhood, area-based phrases), ' +
      'reputationKeywords (trust signals, what customers praise — derived from reviews if provided), ' +
      'searchPhrases (full phrases a customer would type into Google). ' +
      'Avoid generic filler like "professional", "quality service", "best in city" unless backed by review evidence. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Generate categorised keywords for this local business.\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Address: ${business.address}\n` +
      `Location: ${business.zipcode}\n` +
      (business.rating !== null ? `Rating: ${business.rating} stars\n` : '') +
      (business.reviewCount !== null ? `Total reviews: ${business.reviewCount}\n` : '') +
      (business.description ? `Description: ${business.description}\n` : '') +
      (snippets.length > 0
        ? `\nCustomer review excerpts (extract reputation signals from these):\n${snippets.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n`
        : '') +
      `\nReturn JSON in this exact shape (5–8 items per array):\n` +
      `{\n` +
      `  "serviceKeywords": ["gel nails", "acrylic extensions", ...],\n` +
      `  "locationKeywords": ["nail salon Houston", "Westheimer nail salon", ...],\n` +
      `  "reputationKeywords": ["walk-ins welcome", "highly rated nail salon", ...],\n` +
      `  "searchPhrases": ["best nail salon near me", "affordable gel nails Houston", ...]\n` +
      `}`,
  };
}

function parseKeywords(raw: string): { flat: string[]; categories: Keywords } {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);

  const categories: Keywords = {
    serviceKeywords:    Array.isArray(parsed.serviceKeywords)    ? parsed.serviceKeywords.filter((k: unknown) => typeof k === 'string')    : [],
    locationKeywords:   Array.isArray(parsed.locationKeywords)   ? parsed.locationKeywords.filter((k: unknown) => typeof k === 'string')   : [],
    reputationKeywords: Array.isArray(parsed.reputationKeywords) ? parsed.reputationKeywords.filter((k: unknown) => typeof k === 'string') : [],
    searchPhrases:      Array.isArray(parsed.searchPhrases)      ? parsed.searchPhrases.filter((k: unknown) => typeof k === 'string')      : [],
  };

  // Flat list is union of all categories — used for backwards compat and meta tags
  const flat = [
    ...categories.serviceKeywords,
    ...categories.locationKeywords,
    ...categories.reputationKeywords,
    ...categories.searchPhrases,
  ];

  return { flat, categories };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function buildSummaryPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt:
      'You are a copywriter who writes concise business summaries for outreach campaigns. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Write a 2–3 sentence summary of this business that highlights what they do, ` +
      `their reputation, and the fact they have no website (so a developer could use it in outreach).\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Address: ${business.address}\n` +
      (business.rating !== null ? `Rating: ${business.rating} stars\n` : '') +
      (business.reviewCount !== null ? `Reviews: ${business.reviewCount}\n` : '') +
      (business.description ? `Description: ${business.description}\n` : '') +
      `Has website: ${business.website ? 'Yes' : 'No'}\n` +
      `\nReturn JSON in this exact shape:\n` +
      `{"summary": "your 2-3 sentence summary here"}`,
  };
}

function parseSummary(raw: string): string {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.summary !== 'string' || !parsed.summary) throw new Error('summary field missing or not a string');
  return parsed.summary.trim();
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

function buildInsightsPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  const snippets = business.reviewSnippets ?? [];

  return {
    systemPrompt:
      'You are a digital marketing consultant who advises local businesses on improving their online presence. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Analyze this local business and explain why they need a website. Be specific to their actual situation — use their category, rating, review volume, and any review excerpts provided.\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Address: ${business.address}\n` +
      (business.rating !== null ? `Rating: ${business.rating} stars\n` : '') +
      (business.reviewCount !== null ? `Reviews: ${business.reviewCount} total reviews\n` : '') +
      (business.description ? `Description: ${business.description}\n` : '') +
      `Has website: ${business.website ? 'Yes' : 'No'}\n` +
      (business.keywords.length > 0 ? `Keywords: ${business.keywords.join(', ')}\n` : '') +
      (snippets.length > 0
        ? `\nCustomer review excerpts:\n${snippets.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n`
        : '') +
      `\nIMPORTANT: whyNeedsWebsite and whatsMissingOnline must cover DIFFERENT angles — do not repeat the same point.\n` +
      `whyNeedsWebsite: focus on the business opportunity they are missing (customers, bookings, revenue).\n` +
      `whatsMissingOnline: focus on what a customer cannot find or do when they search for this business.\n` +
      `opportunities: make these specific to this business — reference their category, review count, or what customers mention. Avoid generic advice.\n` +
      `\nReturn JSON in this exact shape:\n` +
      `{\n` +
      `  "whyNeedsWebsite": "1-2 sentences on the business opportunity being missed",\n` +
      `  "whatsMissingOnline": "1-2 sentences on what customers cannot find online",\n` +
      `  "opportunities": ["specific opportunity 1", "specific opportunity 2", "specific opportunity 3", "specific opportunity 4", "specific opportunity 5"]\n` +
      `}`,
  };
}

function parseInsights(raw: string): Insights {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.whyNeedsWebsite !== 'string') throw new Error('whyNeedsWebsite missing');
  if (typeof parsed.whatsMissingOnline !== 'string') throw new Error('whatsMissingOnline missing');
  if (!Array.isArray(parsed.opportunities)) throw new Error('opportunities must be an array');
  return {
    whyNeedsWebsite: parsed.whyNeedsWebsite.trim(),
    whatsMissingOnline: parsed.whatsMissingOnline.trim(),
    opportunities: parsed.opportunities.filter((o: unknown) => typeof o === 'string' && o.length > 0),
  };
}

// ---------------------------------------------------------------------------
// Business Context
// ---------------------------------------------------------------------------

function buildBusinessContextPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt:
      'You are a business analyst who writes clear, informative overviews of business categories for non-experts. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Write a business context overview for the following category: "${business.category}".\n\n` +
      `This is NOT about the specific business — it is about the type of business in general.\n\n` +
      `Cover the following in structured prose with clear headings:\n` +
      `- What this type of business does and what it sells/offers\n` +
      `- What sector/industry it belongs to\n` +
      `- How it typically makes money (revenue model)\n` +
      `- Who the typical customers are\n` +
      `- What customers usually expect from this type of business\n` +
      `- How competitive this industry typically is\n` +
      `- Why having an online presence matters specifically for this category\n\n` +
      `Location context: ${business.zipcode} (use this to make any local market observations if relevant).\n\n` +
      `Return JSON in this exact shape:\n` +
      `{"businessContext": "your structured prose with headings here"}`,
  };
}

function parseBusinessContext(raw: string): string {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.businessContext !== 'string' || !parsed.businessContext) throw new Error('businessContext field missing');
  return parsed.businessContext.trim();
}

// ---------------------------------------------------------------------------
// Content Brief
// ---------------------------------------------------------------------------

function buildContentBriefPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  const snippets = business.reviewSnippets ?? [];

  return {
    systemPrompt:
      'You are a content strategist building a detailed content brief for a local business website. ' +
      'Your job is to produce two sections: ' +
      '(1) confirmedFacts — everything we actually know from the data provided; ' +
      '(2) assumptions — what you can reasonably infer for a business of this type/category ' +
      'that we could NOT confirm from the data. Keep the two sections strictly separate. ' +
      'Write in rich, structured prose — use clear headings within each section (e.g. "Services:", "What Customers Love:", "Price Range:"). ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Build a content brief for this local business that will be used to generate their website.\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Address: ${business.address}\n` +
      `Location: ${business.zipcode}\n` +
      (business.phone ? `Phone: ${business.phone}\n` : '') +
      (business.rating !== null ? `Google rating: ${business.rating} stars\n` : '') +
      (business.reviewCount !== null ? `Total reviews: ${business.reviewCount}\n` : '') +
      (business.description ? `Google description: ${business.description}\n` : '') +
      (business.keywords.length > 0 ? `Keywords: ${business.keywords.join(', ')}\n` : '') +
      (business.summary ? `Summary: ${business.summary}\n` : '') +
      (snippets.length > 0
        ? `\nCustomer review excerpts:\n${snippets.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n`
        : '') +
      `\nReturn JSON in this exact shape:\n` +
      `{\n` +
      `  "confirmedFacts": "Structured prose with headings covering: what this business sells/offers, what customers mention in reviews (what's famous, what people love, recurring themes), rating context, any notable specialties confirmed by the data. Use headings like 'Services:', 'What Customers Love:', 'Reputation:'. Only confirmed facts.",\n` +
      `  "assumptions": "Structured prose with headings covering: typical services/products a ${business.category} would offer that aren't confirmed above, likely price range, probable target customers, standard operating hours, common amenities, seasonal offerings. Use headings like 'Likely Services:', 'Estimated Price Range:', 'Target Customers:', 'Probable Hours:'. Frame everything as reasonable inference."\n` +
      `}`,
  };
}

function parseContentBrief(raw: string): ContentBrief {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.confirmedFacts !== 'string') throw new Error('confirmedFacts missing');
  if (typeof parsed.assumptions !== 'string') throw new Error('assumptions missing');
  return {
    confirmedFacts: parsed.confirmedFacts.trim(),
    assumptions: parsed.assumptions.trim(),
  };
}

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

  // Returns tokens used — for callers that track externally (e.g. scraper)
  async generateKeywordsForScraper(business: Business): Promise<{ flat: string[]; categories: Keywords; tokensUsed: number }> {
    return AIService.generateKeywords(business);
  },
};
