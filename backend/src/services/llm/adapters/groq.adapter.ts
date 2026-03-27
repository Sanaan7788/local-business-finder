import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// GroqAdapter
//
// Groq via their OpenAI-compatible API. Extremely fast inference.
// To activate: set LLM_PROVIDER=groq and GROQ_API_KEY in .env
// ---------------------------------------------------------------------------

export class GroqAdapter implements ILLMProvider {
  readonly name = 'groq';
  readonly model = 'llama-3.3-70b-versatile';

  private client: OpenAI;

  constructor() {
    if (!config.llm.groqApiKey) {
      throw new Error('GROQ_API_KEY is not set in .env');
    }

    this.client = new OpenAI({
      apiKey: config.llm.groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('Groq request', {
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

    logger.debug('Groq response', {
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
