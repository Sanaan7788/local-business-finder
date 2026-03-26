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

  async generateKeywords(business: Business): Promise<{ flat: string[]; categories: Keywords }> {
    logger.debug('AIService: generating keywords', { id: business.id, name: business.name });
    const prompt = buildKeywordsPrompt(business);
    const response = await LLMService.complete('keywords', { ...prompt, temperature: 0.4, maxTokens: 600 });
    const result = parseKeywords(response.content);
    logger.debug('AIService: keywords generated', { id: business.id, total: result.flat.length });
    return result;
  },

  async generateSummary(business: Business): Promise<string> {
    logger.debug('AIService: generating summary', { id: business.id, name: business.name });
    const prompt = buildSummaryPrompt(business);
    const response = await LLMService.complete('summary', { ...prompt, temperature: 0.6, maxTokens: 256 });
    const summary = parseSummary(response.content);
    logger.debug('AIService: summary generated', { id: business.id });
    return summary;
  },

  async generateInsights(business: Business): Promise<Insights> {
    logger.debug('AIService: generating insights', { id: business.id, name: business.name });
    const prompt = buildInsightsPrompt(business);
    const response = await LLMService.complete('insights', { ...prompt, temperature: 0.5, maxTokens: 600 });
    const insights = parseInsights(response.content);
    logger.debug('AIService: insights generated', { id: business.id, opportunities: insights.opportunities.length });
    return insights;
  },

  async generateContentBrief(business: Business): Promise<ContentBrief> {
    logger.debug('AIService: generating content brief', { id: business.id, name: business.name });
    const prompt = buildContentBriefPrompt(business);
    const response = await LLMService.complete('contentBrief', { ...prompt, temperature: 0.5, maxTokens: 2048 });
    const contentBrief = parseContentBrief(response.content);
    logger.debug('AIService: content brief generated', { id: business.id });
    return contentBrief;
  },

  // Runs all enrichments in sequence and persists results to the repository.
  async analyzeAll(id: string): Promise<Business> {
    const repo = getRepository();
    let business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    logger.info('AIService: starting full analysis', { id, name: business.name });

    // Step 1: keywords — uses stored reviewSnippets from business record
    const { flat: keywords, categories: keywordCategories } = await AIService.generateKeywords(business);
    business = await repo.update(id, { keywords, keywordCategories, updatedAt: new Date().toISOString() });

    // Step 2: summary
    const summary = await AIService.generateSummary(business);
    business = await repo.update(id, { summary, updatedAt: new Date().toISOString() });

    // Step 3: insights — uses stored reviewSnippets via business record
    const insights = await AIService.generateInsights(business);
    business = await repo.update(id, { insights, updatedAt: new Date().toISOString() });

    // Step 4: content brief — uses stored reviewSnippets via business record
    const contentBrief = await AIService.generateContentBrief(business);
    business = await repo.update(id, { contentBrief, updatedAt: new Date().toISOString() });

    logger.info('AIService: full analysis complete', { id, name: business.name });
    return business;
  },
};
