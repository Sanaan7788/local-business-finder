import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// MistralAdapter
//
// Mistral via their OpenAI-compatible API.
// To activate: set LLM_PROVIDER=mistral and MISTRAL_API_KEY in .env
// ---------------------------------------------------------------------------

export class MistralAdapter implements ILLMProvider {
  readonly name = 'mistral';
  readonly model = 'mistral-large-latest';

  private client: OpenAI;

  constructor() {
    if (!config.llm.mistralApiKey) {
      throw new Error('MISTRAL_API_KEY is not set in .env');
    }

    this.client = new OpenAI({
      apiKey: config.llm.mistralApiKey,
      baseURL: 'https://api.mistral.ai/v1',
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('Mistral request', {
      model: this.model,
      systemLen: request.systemPrompt.length,
      userLen: request.userPrompt.length,
    });

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 4096,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '';
    const durationMs = Date.now() - start;

    logger.debug('Mistral response', {
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
  }
}
