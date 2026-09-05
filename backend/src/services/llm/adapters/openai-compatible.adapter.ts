import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse, ProviderId } from '../llm.interface';
import { LLM_TIMEOUT_MS, ProviderSpec } from '../llm.config';
import { UnprocessableError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// OpenAICompatibleAdapter
//
// One adapter for every provider that speaks the OpenAI chat-completions
// protocol: OpenAI itself, DeepSeek (NVIDIA NIM), Gemini, Mistral, Groq.
// Only the model, base URL and key differ — all of which come from the spec.
// ---------------------------------------------------------------------------

export class OpenAICompatibleAdapter implements ILLMProvider {
  readonly name: ProviderId;
  readonly model: string;
  readonly supportsImages = false;

  private readonly client: OpenAI;

  constructor(spec: ProviderSpec) {
    if (!spec.apiKey) {
      throw new UnprocessableError(`${spec.label}: API key is not set in backend/.env`);
    }
    this.name = spec.id;
    this.model = spec.model;
    this.client = new OpenAI({
      apiKey: spec.apiKey,
      baseURL: spec.baseURL,
      timeout: LLM_TIMEOUT_MS,
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug(`${this.name} request`, {
      model: this.model,
      systemLen: request.systemPrompt.length,
      userLen: request.userPrompt.length,
    });

    const response = await this.client.chat.completions.create({
      model: this.model,
      stream: false,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 4096,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user',   content: request.userPrompt },
      ],
    });

    const choice = response.choices[0];
    const durationMs = Date.now() - start;

    logger.debug(`${this.name} response`, {
      tokensUsed: response.usage?.total_tokens,
      durationMs,
      finishReason: choice?.finish_reason,
    });

    return {
      content: choice?.message?.content ?? '',
      provider: this.name,
      model: this.model,
      tokensUsed: response.usage?.total_tokens,
      durationMs,
      truncated: choice?.finish_reason === 'length',
    };
  }
}
