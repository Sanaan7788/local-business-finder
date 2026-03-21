import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// OpenAIAdapter
//
// OpenAI GPT-4.1 via the official SDK.
// To activate: set LLM_PROVIDER=openai in .env
// ---------------------------------------------------------------------------

export class OpenAIAdapter implements ILLMProvider {
  readonly name = 'openai';
  readonly model = 'gpt-4.1';

  private client: OpenAI;

  constructor() {
    if (!config.llm.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set in .env');
    }

    this.client = new OpenAI({ apiKey: config.llm.openaiApiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('OpenAI request', {
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
        { role: 'user',   content: request.userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '';
    const durationMs = Date.now() - start;

    logger.debug('OpenAI response', {
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
