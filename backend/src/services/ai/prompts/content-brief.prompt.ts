import { Business, ContentBrief, MenuSection } from '../../../types/business.types';

// ---------------------------------------------------------------------------
// Content Brief
// ---------------------------------------------------------------------------

function formatMenuForPrompt(menu: MenuSection[]): string {
  if (!menu || menu.length === 0) return '';
  const lines: string[] = ['\nActual menu scraped from Google Maps:'];
  for (const section of menu) {
    lines.push(`${section.section}:`);
    for (const item of section.items) {
      const price = item.price ? ` — ${item.price}` : '';
      const desc = item.description ? ` (${item.description})` : '';
      lines.push(`  • ${item.name}${price}${desc}`);
    }
  }
  return lines.join('\n');
}

export function buildContentBriefPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  const snippets = business.reviewSnippets ?? [];
  const menuText = formatMenuForPrompt(business.menu ?? []);
  const websiteStructure = business.websiteAnalysis?.structured ?? null;

  return {
    systemPrompt:
      'You are a content strategist building a content brief for a specific local business. ' +
      'You must work ONLY from the data provided in this prompt. ' +
      'Do NOT use any knowledge from previous requests, other businesses, or general assumptions about business names. ' +
      'This business is: ' + business.name + ' (' + business.category + '). ' +
      'Produce two sections: ' +
      '(1) confirmedFacts — ONLY what is explicitly stated in the data provided below; ' +
      '(2) assumptions — what you can reasonably infer for a business of this specific category ' +
      'that is NOT already confirmed by the data. Keep the two sections strictly separate. ' +
      'Write in rich, structured prose — use clear headings within each section. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',

    userPrompt:
      `Build a content brief for this specific business only. Use only the data provided below — do not mix in data from any other business.\n\n` +
      `=== BUSINESS IDENTITY ===\n` +
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
        ? `\n=== CUSTOMER REVIEWS ===\n${snippets.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n`
        : '') +
      (menuText ? `\n=== MENU ===\n${menuText}\n` : '') +
      (websiteStructure
        ? `\n=== EXISTING WEBSITE CONTENT (crawled) ===\n${websiteStructure}\n`
        : '') +
      `\n=== INSTRUCTIONS ===\n` +
      `Return JSON in this exact shape:\n` +
      `{\n` +
      `  "confirmedFacts": "Structured prose covering ONLY facts confirmed by the data above. ` +
      `Include sections for: Services/What they offer, Contact details, Ratings & reputation, What customers say, ` +
      (websiteStructure ? `What their existing website contains, ` : '') +
      `any menu highlights if provided. Use headings like 'Services:', 'Contact:', 'Reputation:', 'What Customers Say:'. Only confirmed facts — nothing invented.",\n` +
      `  "assumptions": "Structured prose covering reasonable inferences for a ${business.category} that are NOT already confirmed above. ` +
      `Use headings like 'Likely Services:', 'Estimated Price Range:', 'Target Customers:', 'Probable Hours:'. Frame everything as inference."\n` +
      `}`,
  };
}

export function parseContentBrief(raw: string): ContentBrief {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.confirmedFacts !== 'string') throw new Error('confirmedFacts missing');
  if (typeof parsed.assumptions !== 'string') throw new Error('assumptions missing');
  return {
    confirmedFacts: parsed.confirmedFacts.trim(),
    assumptions: parsed.assumptions.trim(),
  };
}
