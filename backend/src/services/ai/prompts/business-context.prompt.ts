import { Business } from '../../../types/business.types';

// ---------------------------------------------------------------------------
// Business Context
// ---------------------------------------------------------------------------

export function buildBusinessContextPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
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

export function parseBusinessContext(raw: string): string {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.businessContext !== 'string' || !parsed.businessContext) throw new Error('businessContext field missing');
  return parsed.businessContext.trim();
}
