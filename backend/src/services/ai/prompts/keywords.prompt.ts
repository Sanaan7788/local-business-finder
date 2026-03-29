import { Business, Keywords } from '../../../types/business.types';

// ---------------------------------------------------------------------------
// Keywords (categorised)
// ---------------------------------------------------------------------------

export function buildKeywordsPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
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

export function parseKeywords(raw: string): { flat: string[]; categories: Keywords } {
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
