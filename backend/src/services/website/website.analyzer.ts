import { LLMService } from '../llm/llm.service';
import { WebsiteCrawlerService } from './website.crawler';
import { getRepository } from '../../data/repository.factory';
import { CrawledPage, WebsiteAnalysis } from '../../types/business.types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// WebsiteAnalyzerService
//
// 1. Crawls the business website (multi-page)
// 2. Sends raw crawl data to LLM for structured analysis, score + improvements
// 3. Persists result to DB as websiteAnalysis JSON field
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(
  businessName: string,
  websiteUrl: string,
  pages: CrawledPage[],
): { systemPrompt: string; userPrompt: string } {
  const pagesText = pages.map((p, i) => {
    const lines: string[] = [
      `--- Page ${i + 1}: ${p.url} ---`,
      `Title: ${p.title || '(none)'}`,
    ];
    if (p.navLinks.length)  lines.push(`Nav links: ${p.navLinks.slice(0, 10).join(' | ')}`);
    if (p.headings.length)  lines.push(`Headings: ${p.headings.slice(0, 10).join(' / ')}`);
    if (p.paragraphs.length) lines.push(`Content:\n${p.paragraphs.slice(0, 15).join('\n')}`);
    lines.push(`Images: ${p.images} | Contact form: ${p.hasContactForm} | Phone visible: ${p.hasPhone} | Email visible: ${p.hasEmail}`);
    return lines.join('\n');
  }).join('\n\n');

  return {
    systemPrompt:
      'You are a senior web consultant who reviews small business websites and produces detailed, structured reports. ' +
      'You identify what a website contains, how it is organised, what it does well, and what is missing. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',

    userPrompt:
      `Analyse this small business website and produce a detailed report.\n\n` +
      `Business: ${businessName}\n` +
      `Website: ${websiteUrl}\n` +
      `Pages crawled: ${pages.length}\n\n` +
      `RAW CRAWLED DATA:\n${pagesText}\n\n` +
      `Produce a JSON response with this exact shape:\n` +
      `{\n` +
      `  "structured": "A detailed, well-organised written report of the website structure. ` +
      `Cover: site-wide structure (navbar, footer, pages found), what each page contains (headings, sections, services/products listed), ` +
      `contact details present, testimonials, calls-to-action, media (images/videos), and overall organisation. ` +
      `Use clear headings like '## Homepage', '## Services Page', '## Footer', etc. Be thorough.",\n` +
      `  "score": <integer 1–10 rating of the website quality and completeness>,\n` +
      `  "scoreReason": "1–2 sentences explaining the score — what it does well and what drags it down",\n` +
      `  "improvements": [\n` +
      `    "Specific actionable improvement 1",\n` +
      `    "Specific actionable improvement 2",\n` +
      `    "... (8–12 improvements total, specific to THIS website based on what is missing or weak)"\n` +
      `  ]\n` +
      `}`,
  };
}

function parseAnalysis(raw: string): { structured: string; score: number; scoreReason: string; improvements: string[] } {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.structured !== 'string') throw new Error('structured field missing');
  if (typeof parsed.score !== 'number') throw new Error('score field missing');
  if (typeof parsed.scoreReason !== 'string') throw new Error('scoreReason field missing');
  if (!Array.isArray(parsed.improvements)) throw new Error('improvements field missing');
  return {
    structured: parsed.structured.trim(),
    score: Math.min(10, Math.max(0, Math.round(parsed.score))),
    scoreReason: parsed.scoreReason.trim(),
    improvements: parsed.improvements.filter((i: unknown) => typeof i === 'string'),
  };
}

export const WebsiteAnalyzerService = {

  async analyze(businessId: string): Promise<WebsiteAnalysis> {
    const repo = getRepository();
    const business = await repo.findById(businessId);
    if (!business) throw new Error(`Business not found: ${businessId}`);
    if (!business.websiteUrl) throw new Error(`Business has no website URL: ${businessId}`);

    logger.info('WebsiteAnalyzer: starting analysis', { id: businessId, url: business.websiteUrl });

    // Step 1: Crawl
    const pages = await WebsiteCrawlerService.crawl(business.websiteUrl);

    if (pages.length === 0) {
      throw new Error(`Could not crawl website — no pages accessible at ${business.websiteUrl}`);
    }

    // Step 2: LLM analysis
    logger.debug('WebsiteAnalyzer: sending to LLM', { pages: pages.length });
    const prompt = buildAnalysisPrompt(business.name, business.websiteUrl, pages);
    const response = await LLMService.complete('websiteAnalysis', {
      ...prompt,
      temperature: 0.4,
      maxTokens: 4096,
    });

    const { structured, score, scoreReason, improvements } = parseAnalysis(response.content);

    // Step 3: Persist
    const analysis: WebsiteAnalysis = {
      crawledAt: new Date().toISOString(),
      pagesVisited: pages.length,
      rawPages: pages,
      structured,
      improvements,
      score,
      scoreReason,
    };

    await repo.update(businessId, { websiteAnalysis: analysis, updatedAt: new Date().toISOString() });

    logger.info('WebsiteAnalyzer: analysis complete', { id: businessId, score, pages: pages.length });
    return analysis;
  },

  async updateAnalysis(businessId: string, patch: Partial<Pick<WebsiteAnalysis, 'structured' | 'improvements'>>): Promise<WebsiteAnalysis> {
    const repo = getRepository();
    const business = await repo.findById(businessId);
    if (!business) throw new Error(`Business not found: ${businessId}`);
    if (!business.websiteAnalysis) throw new Error(`No website analysis to update for: ${businessId}`);

    const updated: WebsiteAnalysis = {
      ...business.websiteAnalysis,
      ...patch,
    };

    await repo.update(businessId, { websiteAnalysis: updated, updatedAt: new Date().toISOString() });
    return updated;
  },
};
