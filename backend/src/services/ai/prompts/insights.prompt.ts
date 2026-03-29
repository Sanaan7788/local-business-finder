import { Business, Insights } from '../../../types/business.types';

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export function buildInsightsPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
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

export function parseInsights(raw: string): Insights {
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
