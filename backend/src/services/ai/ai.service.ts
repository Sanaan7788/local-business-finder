import { LLMService } from '../llm/llm.service';
import { Business, Insights, ContentBrief } from '../../types/business.types';
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
// Keywords
// ---------------------------------------------------------------------------

function buildKeywordsPrompt(business: Business, reviewSnippets: string[] = []): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt:
      'You are a local SEO and website copywriter. Generate keywords for a local business that will be used ' +
      'to write their website copy, meta tags, and headings. Include a mix of: service keywords, ' +
      'location keywords, reputation keywords (from reviews if provided), and general business terms. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Generate 15 relevant keywords for this local business.\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Address: ${business.address}\n` +
      `Location: ${business.zipcode}\n` +
      (business.rating !== null ? `Rating: ${business.rating} stars\n` : '') +
      (business.reviewCount !== null ? `Total reviews: ${business.reviewCount}\n` : '') +
      (business.description ? `Description: ${business.description}\n` : '') +
      (reviewSnippets.length > 0
        ? `\nReview excerpts (use these to extract what customers value):\n${reviewSnippets.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n`
        : '') +
      `\nInclude: specific services, location modifiers (city/neighborhood), trust signals, ` +
      `common search phrases customers would use, and terms useful for website headings.\n` +
      `\nReturn JSON in this exact shape:\n` +
      `{"keywords": ["keyword1", "keyword2", ..., "keyword15"]}`,
  };
}

function parseKeywords(raw: string): string[] {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.keywords)) throw new Error('keywords field is not an array');
  return parsed.keywords.filter((k: unknown) => typeof k === 'string' && k.length > 0);
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
  return {
    systemPrompt:
      'You are a digital marketing consultant who advises local businesses on improving their online presence. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Analyze this local business and explain why they need a website. Be specific to their situation.\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Address: ${business.address}\n` +
      (business.rating !== null ? `Rating: ${business.rating} stars\n` : '') +
      (business.reviewCount !== null ? `Reviews: ${business.reviewCount}\n` : '') +
      (business.description ? `Description: ${business.description}\n` : '') +
      `Has website: ${business.website ? 'Yes' : 'No'}\n` +
      (business.keywords.length > 0 ? `Keywords: ${business.keywords.join(', ')}\n` : '') +
      `\nReturn JSON in this exact shape:\n` +
      `{\n` +
      `  "whyNeedsWebsite": "1-2 sentences specific to this business",\n` +
      `  "whatsMissingOnline": "1-2 sentences on what is absent from their online presence",\n` +
      `  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4", "opportunity 5"]\n` +
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

function buildContentBriefPrompt(
  business: Business,
  reviewSnippets: string[] = [],
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt:
      'You are a content strategist building a detailed content brief for a local business website. ' +
      'Your job is to produce two sections: ' +
      '(1) confirmedFacts — everything we actually know from the data provided; ' +
      '(2) assumptions — what you can reasonably infer for a business of this type/category ' +
      'that we could NOT confirm from the data. Keep the two sections strictly separate. ' +
      'Write in rich, structured prose (use line breaks and headings within each section). ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',
    userPrompt:
      `Build a content brief for this local business that will be used to generate their website.\\n\\n` +
      `Business name: ${business.name}\\n` +
      `Category: ${business.category}\\n` +
      `Address: ${business.address}\\n` +
      `Location: ${business.zipcode}\\n` +
      (business.phone ? `Phone: ${business.phone}\\n` : '') +
      (business.rating !== null ? `Google rating: ${business.rating} stars\\n` : '') +
      (business.reviewCount !== null ? `Total reviews: ${business.reviewCount}\\n` : '') +
      (business.description ? `Google description: ${business.description}\\n` : '') +
      (business.keywords.length > 0 ? `Keywords: ${business.keywords.join(', ')}\\n` : '') +
      (business.summary ? `Summary: ${business.summary}\\n` : '') +
      (reviewSnippets.length > 0
        ? `\\nCustomer review excerpts:\\n${reviewSnippets.map((s, i) => `${i + 1}. "${s}"`).join('\\n')}\\n`
        : '') +
      `\\nReturn JSON in this exact shape:\\n` +
      `{\\n` +
      `  "confirmedFacts": "Detailed prose covering: what this business sells/offers (products, services, categories), ` +
      `what customers mention in reviews (what's famous, what people love, recurring praise or complaints), ` +
      `rating context, years/history if mentioned, any notable specialties found in the data. ` +
      `Only include what you can confirm from the data above.",\\n` +
      `  "assumptions": "Detailed prose covering: typical services/products a ${business.category} business would offer that aren't confirmed above, ` +
      `likely price range, probable target customers, standard operating hours, common amenities, ` +
      `seasonal variations, and anything else a website visitor would want to know. ` +
      `Clearly frame these as reasonable inferences, not confirmed facts."\\n` +
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

  async generateKeywords(business: Business, reviewSnippets: string[] = []): Promise<string[]> {
    logger.debug('AIService: generating keywords', { id: business.id, name: business.name });
    const prompt = buildKeywordsPrompt(business, reviewSnippets);
    const response = await LLMService.complete('keywords', { ...prompt, temperature: 0.4, maxTokens: 400 });
    const keywords = parseKeywords(response.content);
    logger.debug('AIService: keywords generated', { id: business.id, count: keywords.length });
    return keywords;
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
    const response = await LLMService.complete('insights', { ...prompt, temperature: 0.5, maxTokens: 512 });
    const insights = parseInsights(response.content);
    logger.debug('AIService: insights generated', { id: business.id, opportunities: insights.opportunities.length });
    return insights;
  },

  async generateContentBrief(business: Business, reviewSnippets: string[] = []): Promise<ContentBrief> {
    logger.debug('AIService: generating content brief', { id: business.id, name: business.name });
    const prompt = buildContentBriefPrompt(business, reviewSnippets);
    const response = await LLMService.complete('contentBrief', { ...prompt, temperature: 0.5, maxTokens: 1024 });
    const contentBrief = parseContentBrief(response.content);
    logger.debug('AIService: content brief generated', { id: business.id });
    return contentBrief;
  },

  // Runs all enrichments in sequence and persists results to the repository.
  async analyzeAll(id: string, reviewSnippets: string[] = []): Promise<Business> {
    const repo = getRepository();
    let business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    logger.info('AIService: starting full analysis', { id, name: business.name });

    // Step 1: keywords (enriched with review snippets if available)
    const keywords = await AIService.generateKeywords(business, reviewSnippets);
    business = await repo.update(id, { keywords, updatedAt: new Date().toISOString() });

    // Step 2: summary (can use keywords in context)
    const summary = await AIService.generateSummary(business);
    business = await repo.update(id, { summary, updatedAt: new Date().toISOString() });

    // Step 3: insights (can use keywords + summary in context)
    const insights = await AIService.generateInsights(business);
    business = await repo.update(id, { insights, updatedAt: new Date().toISOString() });

    // Step 4: content brief (uses all prior enrichments + review snippets)
    const contentBrief = await AIService.generateContentBrief(business, reviewSnippets);
    business = await repo.update(id, { contentBrief, updatedAt: new Date().toISOString() });

    logger.info('AIService: full analysis complete', { id, name: business.name });
    return business;
  },
};
