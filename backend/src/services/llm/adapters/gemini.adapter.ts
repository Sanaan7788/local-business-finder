import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// GeminiAdapter
//
// Google Gemini via the OpenAI-compatible endpoint.
// To activate: set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env
// ---------------------------------------------------------------------------

export class GeminiAdapter implements ILLMProvider {
  readonly name = 'gemini';
  readonly model = 'gemini-2.0-flash';

  private client: OpenAI;

  constructor() {
    if (!config.llm.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set in .env');
    }

    this.client = new OpenAI({
      apiKey: config.llm.geminiApiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('Gemini request', {
      model: this.model,
      systemLen: request.systemPrompt.length,
      userLen: request.userPrompt.length,
    });

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          stream: false,
          temperature: request.temperature ?? 0.6,
          max_tokens: request.maxTokens ?? 4096,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
        });

        const content = response.choices[0]?.message?.content ?? '';
        const durationMs = Date.now() - start;

        logger.debug('Gemini response', {
          tokensUsed: response.usage?.total_tokens,
          durationMs,
          finishReason: response.choices[0]?.finish_reason,
        });

        return {
          content,
          provider: this.name,
          model: this.model,
          tokensUsed: response.usage?.total_tokens,
          durationMs,
        };
      } catch (err: any) {
        const status = err?.status ?? err?.response?.status;
        if (status === 429 && attempt < maxRetries) {
          const waitMs = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
          logger.warn(`Gemini 429 rate limit — retrying in ${waitMs}ms`, { attempt });
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          throw err;
        }
      }
    }

    throw new Error('Gemini: max retries exceeded');
  }
}
