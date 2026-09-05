import { Business } from '../../types/business.types';

// ---------------------------------------------------------------------------
// Website prompt — the single source of truth for what we ask the LLM to build.
//
// The SYSTEM prompt carries only the role and the output contract (the parts
// extractHtml/validateHtml depend on, and that must survive any user edit).
// The USER prompt carries all business data and every design requirement, and
// is self-sufficient: the saved default can be pasted into any other AI tool.
//
// Sites are fully self-contained (inline CSS, no CDN): the in-app preview
// iframe runs without scripts, so a Tailwind-CDN site would render unstyled.
// ---------------------------------------------------------------------------

export const WEBSITE_MAX_TOKENS = 8192; // the ceiling every configured provider supports

export const WEBSITE_SYSTEM_PROMPT = [
  'You are an expert web developer who builds websites for local businesses.',
  'You will receive a brief describing one business and the requirements for its website.',
  'Output rules (always apply, regardless of the brief):',
  '- Respond with ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>.',
  '- No explanation, no markdown, no code fences.',
  '- The document must be fully self-contained: one <style> block for all CSS, any JavaScript inline in one <script> block; no external stylesheets, scripts, fonts, or images.',
  '- Never use placeholder text; use only the facts in the brief.',
].join('\n');

export const WEBSITE_REQUIREMENTS = [
  '- Single-file HTML: all CSS in one <style> block, any JS inline; no external dependencies (no CDN, no web fonts, no external images)',
  '- Mobile-first, fully responsive; system font stack',
  '- <head>: charset, viewport, <title>, meta description and meta keywords built from the keywords above',
  '- Sections: Hero (business name, tagline, primary call-to-action), About, Services — or Menu showing the exact items and prices when a menu is provided, Testimonials (only when real reviews are provided; quote them verbatim), Contact (real phone as a tel: link, real address, link to the Google Maps listing when provided)',
  '- Use CONFIRMED FACTS as page content; use ASSUMPTIONS only to fill gaps and keep them generic',
  '- Address every listed IMPROVEMENT OPPORTUNITY in the new site',
  '- Modern, professional look with a colour palette that suits the business category and good contrast',
  '- Clear call-to-action (e.g. "Call Now", "Book Appointment", "Get a Quote")',
  '- Smooth-scroll navigation via CSS (scroll-behavior: smooth); the site must work with JavaScript disabled',
  '- No external images — use emoji, CSS shapes or gradients for visual interest',
  '- Keep CSS compact; the whole file should stay under roughly 600 lines',
];

function section(title: string, body: string[]): string[] {
  return body.length ? [`== ${title} ==`, ...body, ''] : [];
}

function formatMenu(business: Business): string[] {
  const lines: string[] = [];
  for (const s of business.menu) {
    lines.push(`${s.section}:`);
    for (const item of s.items) {
      const price = item.price ? ` — ${item.price}` : '';
      const desc = item.description ? ` (${item.description})` : '';
      lines.push(`  • ${item.name}${price}${desc}`);
    }
  }
  return lines;
}

function formatKeywords(business: Business): string[] {
  const kc = business.keywordCategories;
  if (kc) {
    const lines: string[] = [];
    if (kc.serviceKeywords.length)    lines.push(`Services: ${kc.serviceKeywords.join(', ')}`);
    if (kc.locationKeywords.length)   lines.push(`Location: ${kc.locationKeywords.join(', ')}`);
    if (kc.reputationKeywords.length) lines.push(`Trust signals: ${kc.reputationKeywords.join(', ')}`);
    if (kc.searchPhrases.length)      lines.push(`Search phrases: ${kc.searchPhrases.join(', ')}`);
    return lines;
  }
  return business.keywords.length ? [business.keywords.join(', ')] : [];
}

/** The default prompt saved to websitePrompt and used when none is saved. */
export function buildDefaultWebsitePrompt(business: Business): string {
  const info: string[] = [
    `Name: ${business.name}`,
    `Category: ${business.category}`,
  ];
  if (business.address)          info.push(`Address: ${business.address}`);
  if (business.phone)            info.push(`Phone: ${business.phone}`);
  if (business.websiteUrl)       info.push(`Current website: ${business.websiteUrl}`);
  if (business.rating !== null)  info.push(`Google rating: ${business.rating} stars (${business.reviewCount ?? 0} reviews)`);
  if (business.googleMapsUrl)    info.push(`Google Maps: ${business.googleMapsUrl}`);
  if (business.description)      info.push(`Description: ${business.description}`);

  const insights = business.insights
    ? [
        `Why they need a website: ${business.insights.whyNeedsWebsite}`,
        `What's missing online: ${business.insights.whatsMissingOnline}`,
        ...(business.insights.opportunities.length
          ? ['Opportunities:', ...business.insights.opportunities.map((o) => `  - ${o}`)]
          : []),
      ]
    : [];

  const wa = business.websiteAnalysis;

  return [
    'Build a complete, modern, single-page website for the local business described below.',
    '',
    ...section('BUSINESS INFORMATION', info),
    ...section('BUSINESS SUMMARY', business.summary ? [business.summary] : []),
    ...section('CONFIRMED FACTS (use these as real content)', business.contentBrief ? [business.contentBrief.confirmedFacts] : []),
    ...section('ASSUMPTIONS (fill gaps with these; keep them generic)', business.contentBrief ? [business.contentBrief.assumptions] : []),
    ...section('KEYWORDS TO USE IN COPY', formatKeywords(business)),
    ...section('BUSINESS INSIGHTS', insights),
    ...section('EXISTING WEBSITE ANALYSIS', wa?.structured ? [wa.structured] : []),
    ...section('IMPROVEMENT OPPORTUNITIES (address these in the new site)', wa?.improvements?.length ? wa.improvements.map((i) => `  - ${i}`) : []),
    ...section('REAL CUSTOMER REVIEWS (quote these in the testimonials section)', business.reviewSnippets.slice(0, 5).map((r) => `  "${r}"`)),
    ...section('MENU (scraped from Google Maps — show these exact items and prices)', formatMenu(business)),
    ...section('REQUIREMENTS', WEBSITE_REQUIREMENTS),
    'Return only the complete HTML file — no explanation, no markdown, no code fences.',
  ].join('\n');
}
