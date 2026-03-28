import { LLMService } from '../llm/llm.service';
import { Business } from '../../types/business.types';
import { getRepository } from '../../data/repository.factory';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// WebsiteGenerator
//
// Generates a complete single-file HTML website for a business using the LLM.
// The generated HTML is self-contained: all CSS via Tailwind CDN, no build step.
//
// Steps:
//   1. buildPrompt()   — constructs the LLM prompt from the business profile
//   2. LLMService call — gets raw HTML back
//   3. extractHtml()   — strips markdown fences if present
//   4. validateHtml()  — ensures the response is actually HTML
//   5. repo.update()   — saves to generatedWebsiteCode
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Slug utility
// Used for Vercel project names and GitHub folder paths.
// e.g. "Tony's Plumbing" + "10011" → "tonys-plumbing-10011"
// ---------------------------------------------------------------------------

export function slugify(name: string, zipcode: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
      .trim()
      .replace(/\s+/g, '-')            // spaces to dashes
      .replace(/-+/g, '-')             // collapse multiple dashes
      .slice(0, 40)                    // cap length
    + '-' + zipcode.replace(/\D/g, '').slice(0, 5)
  );
}

// ---------------------------------------------------------------------------
// Prompt builder (Step 7.1)
// ---------------------------------------------------------------------------

function buildWebsitePrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  const phoneLine = business.phone ? `Phone: ${business.phone}` : '';
  const ratingLine = business.rating !== null ? `Google rating: ${business.rating} stars` : '';
  const reviewLine = business.reviewCount !== null ? `Review count: ${business.reviewCount} reviews` : '';
  const descLine = business.description ? `Description: ${business.description}` : '';
  const keywordsLine = business.keywords.length > 0
    ? `SEO keywords: ${business.keywords.join(', ')}`
    : '';
  const summaryLine = business.summary ? `Business summary: ${business.summary}` : '';

  // Content brief provides the richest signal — use it as a dedicated section when available
  const contentBriefSection = business.contentBrief
    ? [
        '',
        '=== CONFIRMED FACTS ABOUT THIS BUSINESS ===',
        business.contentBrief.confirmedFacts,
        '',
        '=== REASONABLE ASSUMPTIONS (not confirmed, but typical for this type of business) ===',
        business.contentBrief.assumptions,
      ].join('\n')
    : '';

  return {
    systemPrompt: [
      'You are an expert web developer specializing in local business websites.',
      'Generate a complete, production-ready, single-file HTML website.',
      'Requirements:',
      '- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>',
      '- Mobile-first, fully responsive',
      '- Include all meta tags (charset, viewport, description, keywords)',
      '- Sections: hero, about, services, contact',
      '- Use real business data provided — no placeholder text like [Business Name]',
      '- If a Content Brief is provided, use the confirmed facts for real page content and assumptions only to fill gaps',
      '- Hero section must prominently show the business name and a clear tagline',
      '- Contact section must show the real phone number and address',
      '- Clean, professional design with good color contrast',
      '- No external images — use emoji or CSS shapes for visual interest',
      '- Output ONLY the raw HTML starting with <!DOCTYPE html>',
      '- Do NOT wrap in markdown code fences or add any explanation',
    ].join('\n'),

    userPrompt: [
      `Business name: ${business.name}`,
      `Category: ${business.category}`,
      `Address: ${business.address}`,
      phoneLine,
      descLine,
      ratingLine,
      reviewLine,
      keywordsLine,
      summaryLine,
      contentBriefSection,
      '',
      'Generate the complete HTML website now.',
    ].filter(Boolean).join('\n'),
  };
}

// ---------------------------------------------------------------------------
// HTML extraction + validation (Step 7.2)
// ---------------------------------------------------------------------------

function extractHtml(raw: string): string {
  // Strip markdown code fences if the LLM added them despite instructions
  let html = raw.trim();
  if (html.startsWith('```')) {
    html = html
      .replace(/^```(?:html)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
  }
  return html;
}

function validateHtml(html: string): void {
  if (!html.toLowerCase().includes('<!doctype html')) {
    throw new Error('Generated content does not start with <!DOCTYPE html>');
  }
  if (!html.toLowerCase().includes('</html>')) {
    throw new Error('Generated content is missing closing </html> tag — response may have been truncated');
  }
  if (html.length < 500) {
    throw new Error(`Generated HTML is suspiciously short (${html.length} chars)`);
  }
}

// ---------------------------------------------------------------------------
// Project file assembler (Step 7.3)
// Produces the deployment package: index.html content + vercel.json content.
// ---------------------------------------------------------------------------

export interface WebsitePackage {
  slug: string;
  indexHtml: string;       // the generated HTML
  vercelJson: string;      // vercel.json as a string (framework: null for static)
}

export function assemblePackage(business: Business, html: string): WebsitePackage {
  const slug = slugify(business.name, business.zipcode);

  const vercelJson = JSON.stringify({ version: 2, builds: [{ src: '**', use: '@vercel/static' }] }, null, 2);

  return { slug, indexHtml: html, vercelJson };
}

// ---------------------------------------------------------------------------
// WebsiteGeneratorService — public API
// ---------------------------------------------------------------------------

export const WebsiteGeneratorService = {

  slugify,

  async generate(id: string): Promise<Business> {
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    logger.info('WebsiteGenerator: generating website', { id, name: business.name });

    const prompt = buildWebsitePrompt(business);
    const response = await LLMService.complete('websiteGeneration', {
      ...prompt,
      temperature: 0.5,
      maxTokens: 4096,
    });

    const html = extractHtml(response.content);
    validateHtml(html);

    const updated = await repo.update(id, {
      generatedWebsiteCode: html,
      tokensUsed: business.tokensUsed + (response.tokensUsed ?? 0),
      updatedAt: new Date().toISOString(),
    });

    logger.info('WebsiteGenerator: website saved', {
      id,
      name: business.name,
      htmlLength: html.length,
    });

    return updated;
  },

  async getPackage(id: string): Promise<WebsitePackage> {
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);
    if (!business.generatedWebsiteCode) {
      throw new Error('Website not yet generated. Call POST /website first.');
    }
    return assemblePackage(business, business.generatedWebsiteCode);
  },
};
