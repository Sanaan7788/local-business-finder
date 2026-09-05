import { MenuSection } from '../../../types/business.types';
import { UpstreamError } from '../../../utils/errors';
import { parseLlmJson } from './llm-json';

// ---------------------------------------------------------------------------
// Menu extraction from photos (vision). Only Claude supports image input.
// ---------------------------------------------------------------------------

export function buildMenuExtractionPrompt(
  businessName: string,
  imageCount: number,
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt:
      'You are a menu digitisation specialist. Extract every menu item from the provided image(s). ' +
      'Group items under their section headings exactly as shown. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',

    userPrompt:
      `Extract the full menu from ${imageCount > 1 ? `these ${imageCount} menu images` : 'this menu image'} for ${businessName}.\n\n` +
      `Return JSON in this exact shape:\n` +
      `[\n` +
      `  {\n` +
      `    "section": "Section name (e.g. Starters, Mains, Drinks — use 'Menu' if no sections visible)",\n` +
      `    "items": [\n` +
      `      { "name": "Item name", "price": "$X.XX or null if not visible", "description": "Short description or null" }\n` +
      `    ]\n` +
      `  }\n` +
      `]\n\n` +
      `Rules:\n` +
      `- Include every visible item — do not skip anything\n` +
      `- Preserve exact section names from the menu\n` +
      `- If price is not shown, use null\n` +
      `- If description is not shown, use null\n` +
      `- Return an empty array [] if no menu items are visible`,
  };
}

export function parseMenuExtraction(raw: string): MenuSection[] {
  const parsed = parseLlmJson(raw);
  if (!Array.isArray(parsed)) throw new UpstreamError('Menu extraction did not return an array');

  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

  return parsed
    .filter((s) => s && typeof s.section === 'string' && Array.isArray(s.items))
    .map((s) => ({
      section: s.section.trim(),
      items: (s.items as unknown[])
        .filter((i): i is { name: string; price?: unknown; description?: unknown } =>
          Boolean(i) && typeof (i as { name?: unknown }).name === 'string')
        .map((i) => ({ name: i.name.trim(), price: str(i.price), description: str(i.description) })),
    }))
    .filter((s) => s.items.length > 0);
}
