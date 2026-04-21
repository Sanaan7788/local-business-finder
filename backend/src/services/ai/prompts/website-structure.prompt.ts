import { CrawledPage } from '../../../types/business.types';

// ---------------------------------------------------------------------------
// Website Structure & Content Prompt
//
// Dedicated prompt for extracting the structure and content of a crawled
// business website. Separated so it can be revised independently of the
// scoring/improvements prompt.
// ---------------------------------------------------------------------------

function formatPages(pages: CrawledPage[]): string {
  return pages.map((p, i) => {
    const lines: string[] = [
      `--- Page ${i + 1}: ${p.url} ---`,
      `Title: ${p.title || '(none)'}`,
    ];
    if (p.navLinks.length)   lines.push(`Nav links: ${p.navLinks.slice(0, 10).join(' | ')}`);
    if (p.headings.length)   lines.push(`Headings: ${p.headings.slice(0, 10).join(' / ')}`);
    if (p.paragraphs.length) lines.push(`Content:\n${p.paragraphs.slice(0, 15).join('\n')}`);
    lines.push(`Images: ${p.images} | Contact form: ${p.hasContactForm} | Phone visible: ${p.hasPhone} | Email visible: ${p.hasEmail}`);
    return lines.join('\n');
  }).join('\n\n');
}

export function buildWebsiteStructurePrompt(
  businessName: string,
  websiteUrl: string,
  pages: CrawledPage[],
): { systemPrompt: string; userPrompt: string } {
  const pagesText = formatPages(pages);

  return {
    systemPrompt:
      'You are a senior web consultant who reviews small business websites and produces detailed, structured reports. ' +
      'You identify what a website contains, how it is organised, what it does well, and what is missing. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',

    userPrompt:
      `Extract the structure and content of this business website.\n\n` +
      `Business: ${businessName}\n` +
      `Website: ${websiteUrl}\n` +
      `Pages crawled: ${pages.length}\n\n` +
      `RAW CRAWLED DATA:\n${pagesText}\n\n` +
      `Return a JSON object with this exact shape:\n` +
      `{\n` +
      `  "structured": "A detailed, well-organised written report of the website structure. ` +
      `Cover: site-wide structure (navbar, footer, pages found), what each page contains (headings, sections, services/products listed), ` +
      `contact details present, testimonials, calls-to-action, media (images/videos), and overall organisation. ` +
      `Use clear headings like '## Homepage', '## Services Page', '## Footer', etc. Be thorough."\n` +
      `}`,
  };
}

export function parseWebsiteStructure(raw: string): string {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.structured !== 'string') throw new Error('structured field missing');
  return parsed.structured.trim();
}
