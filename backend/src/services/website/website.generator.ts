import { LLMService } from '../llm/llm.service';
import { Business } from '../../types/business.types';
import { getRepository } from '../../data/repository.factory';
import { NotFoundError, UpstreamError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { WEBSITE_MAX_TOKENS, WEBSITE_SYSTEM_PROMPT, buildDefaultWebsitePrompt } from './website.prompt';

// ---------------------------------------------------------------------------
// WebsiteGeneratorService
//
// generatePrompt()  — saves the default prompt on the business so it can be
//                     reviewed and edited before generation.
// generate()        — sends the saved prompt (or the default when none is
//                     saved) to the LLM and stores the resulting HTML.
// ---------------------------------------------------------------------------

function extractHtml(raw: string): string {
  // Strip markdown fences if the LLM added them despite instructions
  let html = raw.trim();
  if (html.startsWith('```')) {
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return html;
}

function validateHtml(html: string, truncated?: boolean): void {
  if (!html.toLowerCase().includes('<!doctype html')) {
    throw new UpstreamError('Generated content does not start with <!DOCTYPE html>');
  }
  if (!html.toLowerCase().includes('</html>')) {
    throw new UpstreamError(
      truncated
        ? 'Generated website was cut off — the output hit the token limit. Try again or shorten the prompt.'
        : 'Generated content is missing the closing </html> tag — the response may have been truncated.',
    );
  }
  if (html.length < 500) {
    throw new UpstreamError(`Generated HTML is suspiciously short (${html.length} chars)`);
  }
}

async function findBusiness(id: string): Promise<Business> {
  const business = await getRepository().findById(id);
  if (!business) throw new NotFoundError('Business', id);
  return business;
}

export const WebsiteGeneratorService = {

  async generatePrompt(id: string): Promise<Business> {
    const business = await findBusiness(id);
    return getRepository().update(id, { websitePrompt: buildDefaultWebsitePrompt(business) });
  },

  async generate(id: string): Promise<Business> {
    const business = await findBusiness(id);
    const saved = business.websitePrompt?.trim();
    const userPrompt = saved || buildDefaultWebsitePrompt(business);

    logger.info('WebsiteGenerator: generating website', { id, name: business.name, savedPrompt: Boolean(saved) });

    const response = await LLMService.complete('websiteGeneration', {
      systemPrompt: WEBSITE_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.5,
      maxTokens: WEBSITE_MAX_TOKENS,
    });

    const html = extractHtml(response.content);
    validateHtml(html, response.truncated);

    // Persist the prompt that produced the site so the UI shows exactly what was used
    const updated = await getRepository().update(id, {
      generatedWebsiteCode: html,
      websitePrompt: saved ? business.websitePrompt : userPrompt,
      tokensUsed: business.tokensUsed + (response.tokensUsed ?? 0),
    });

    logger.info('WebsiteGenerator: website saved', { id, name: business.name, htmlLength: html.length });
    return updated;
  },
};
