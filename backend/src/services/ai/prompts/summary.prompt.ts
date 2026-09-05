import { Business } from '../../../types/business.types';
import { parseLlmJson } from './llm-json';
import { UpstreamError } from '../../../utils/errors';

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function buildSummaryPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
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

export function parseSummary(raw: string): string {
  const parsed = parseLlmJson(raw);
  if (typeof parsed.summary !== 'string' || !parsed.summary) throw new UpstreamError('summary field missing or not a string');
  return parsed.summary.trim();
}
