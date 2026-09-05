import { LLMService } from '../llm/llm.service';
import { WebsiteCrawlerService } from './website.crawler';
import { getRepository } from '../../data/repository.factory';
import { CrawledPage, WebsiteAnalysis } from '../../types/business.types';
import { NotFoundError, UnprocessableError, UpstreamError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { buildWebsiteStructurePrompt, parseWebsiteStructure } from '../ai/prompts/website-structure.prompt';
import { parseLlmJson } from '../ai/prompts/llm-json';

// ---------------------------------------------------------------------------
// WebsiteAnalyzerService
//
// 1. Crawls the business website (multi-page)
// 2. Runs two independent LLM prompts concurrently:
//    - structure: what the site contains and how it is organised
//    - analysis:  a 1–10 score and a list of improvements
// 3. Persists the combined result (plus any emails found) on the business
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
    if (p.navLinks.length)   lines.push(`Nav links: ${p.navLinks.slice(0, 10).join(' | ')}`);
    if (p.headings.length)   lines.push(`Headings: ${p.headings.slice(0, 10).join(' / ')}`);
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
      `Analyse this small business website and produce a scoring report.\n\n` +
      `Business: ${businessName}\n` +
      `Website: ${websiteUrl}\n` +
      `Pages crawled: ${pages.length}\n\n` +
      `RAW CRAWLED DATA:\n${pagesText}\n\n` +
      `Produce a JSON response with this exact shape:\n` +
      `{\n` +
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

function parseAnalysis(raw: string): { score: number; scoreReason: string; improvements: string[] } {
  const parsed = parseLlmJson(raw);
  if (typeof parsed.score !== 'number') throw new UpstreamError('score field missing');
  if (typeof parsed.scoreReason !== 'string') throw new UpstreamError('scoreReason field missing');
  if (!Array.isArray(parsed.improvements)) throw new UpstreamError('improvements field missing');
  return {
    score: Math.min(10, Math.max(0, Math.round(parsed.score))),
    scoreReason: parsed.scoreReason.trim(),
    improvements: parsed.improvements.filter((i: unknown) => typeof i === 'string'),
  };
}

export const WebsiteAnalyzerService = {

  async analyze(businessId: string): Promise<WebsiteAnalysis> {
    const repo = getRepository();
    const business = await repo.findById(businessId);
    if (!business) throw new NotFoundError('Business', businessId);
    if (!business.websiteUrl) throw new UnprocessableError('This business has no website URL to analyse.');

    logger.info('WebsiteAnalyzer: starting analysis', { id: businessId, url: business.websiteUrl });

    const pages = await WebsiteCrawlerService.crawl(business.websiteUrl);
    if (pages.length === 0) {
      throw new UnprocessableError(
        `Could not crawl ${business.websiteUrl} — no pages were reachable. The URL may be wrong or the site may be down.`,
      );
    }

    const [structureResponse, analysisResponse] = await Promise.all([
      LLMService.complete('websiteStructure', {
        ...buildWebsiteStructurePrompt(business.name, business.websiteUrl, pages),
        temperature: 0.3,
        maxTokens: 2048,
      }),
      LLMService.complete('websiteAnalysis', {
        ...buildAnalysisPrompt(business.name, business.websiteUrl, pages),
        temperature: 0.4,
        maxTokens: 2048,
      }),
    ]);

    const structured = parseWebsiteStructure(structureResponse.content);
    const { score, scoreReason, improvements } = parseAnalysis(analysisResponse.content);
    const scrapedEmails = Array.from(new Set(pages.flatMap((p) => p.emails ?? [])));
    const tokensUsed = (structureResponse.tokensUsed ?? 0) + (analysisResponse.tokensUsed ?? 0);

    const analysis: WebsiteAnalysis = {
      crawledAt: new Date().toISOString(),
      pagesVisited: pages.length,
      rawPages: pages,
      structured,
      improvements,
      score,
      scoreReason,
    };

    await repo.update(businessId, {
      websiteAnalysis: analysis,
      scrapedEmails,
      tokensUsed: business.tokensUsed + tokensUsed,
    });

    logger.info('WebsiteAnalyzer: analysis complete', { id: businessId, score, pages: pages.length, emails: scrapedEmails.length });
    return analysis;
  },

  async updateAnalysis(
    businessId: string,
    patch: Partial<Pick<WebsiteAnalysis, 'structured' | 'improvements'>>,
  ): Promise<WebsiteAnalysis> {
    const repo = getRepository();
    const business = await repo.findById(businessId);
    if (!business) throw new NotFoundError('Business', businessId);
    if (!business.websiteAnalysis) throw new UnprocessableError('No website analysis to update — run the analysis first.');

    const updated: WebsiteAnalysis = { ...business.websiteAnalysis, ...patch };
    await repo.update(businessId, { websiteAnalysis: updated });
    return updated;
  },
};
