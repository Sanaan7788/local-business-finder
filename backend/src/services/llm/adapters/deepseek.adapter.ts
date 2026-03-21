import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// DeepSeekAdapter
//
// DeepSeek v3.2 via NVIDIA NIM.
// NVIDIA NIM exposes an OpenAI-compatible API so we use the OpenAI SDK
// with a custom baseURL pointing to integrate.api.nvidia.com.
// ---------------------------------------------------------------------------

export class DeepSeekAdapter implements ILLMProvider {
  readonly name = 'deepseek';
  readonly model: string;

  private client: OpenAI;

  constructor() {
    this.model = config.llm.deepseekModel;

    if (!config.llm.deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY is not set in .env');
    }

    this.client = new OpenAI({
      apiKey: config.llm.deepseekApiKey,
      baseURL: config.llm.deepseekBaseUrl,
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('DeepSeek request', {
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

    logger.debug('DeepSeek response', {
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
