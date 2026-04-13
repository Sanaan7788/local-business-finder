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
      (menuText ? menuText + '\n' : '') +
      `\nReturn JSON in this exact shape:\n` +
      `{\n` +
      `  "confirmedFacts": "Structured prose with headings covering: what this business sells/offers, what customers mention in reviews (what's famous, what people love, recurring themes), rating context, any notable specialties confirmed by the data. If a menu was provided, include a 'Menu Highlights:' section listing key items and prices. Use headings like 'Services:', 'Menu Highlights:', 'What Customers Love:', 'Reputation:'. Only confirmed facts.",\n` +
      `  "assumptions": "Structured prose with headings covering: typical services/products a ${business.category} would offer that aren't confirmed above, likely price range, probable target customers, standard operating hours, common amenities, seasonal offerings. Use headings like 'Likely Services:', 'Estimated Price Range:', 'Target Customers:', 'Probable Hours:'. Frame everything as reasonable inference."\n` +
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
