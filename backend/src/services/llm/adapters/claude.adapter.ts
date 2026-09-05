import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';
import { LLM_TIMEOUT_MS, ProviderSpec } from '../llm.config';
import { UnprocessableError, UpstreamError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// ClaudeAdapter — Anthropic via the official SDK. The only adapter with
// vision support, which menu extraction relies on.
// ---------------------------------------------------------------------------

// Sonnet 5, Opus 4.7+ and the Fable/Mythos family reject sampling parameters
// (temperature/top_p/top_k) with HTTP 400, so they are omitted for those.
const SAMPLING_UNSUPPORTED = /^claude-(sonnet-5|opus-(4-7|4-8|5)|fable|mythos)/;

export class ClaudeAdapter implements ILLMProvider {
  readonly name = 'claude' as const;
  readonly model: string;
  readonly supportsImages = true;

  private readonly client: Anthropic;

  constructor(spec: ProviderSpec) {
    if (!spec.apiKey) {
      throw new UnprocessableError('Claude: ANTHROPIC_API_KEY is not set in backend/.env');
    }
    this.model = spec.model;
    this.client = new Anthropic({ apiKey: spec.apiKey, timeout: LLM_TIMEOUT_MS });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('claude request', {
      model: this.model,
      systemLen: request.systemPrompt.length,
      userLen: request.userPrompt.length,
      images: request.images?.length ?? 0,
    });

    type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;
    const userContent: ContentBlock[] = (request.images ?? []).map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    }));
    userContent.push({ type: 'text', text: request.userPrompt });

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      ...(SAMPLING_UNSUPPORTED.test(this.model) ? {} : { temperature: request.temperature ?? 0.6 }),
      system: request.systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!block) throw new UpstreamError('Claude returned no text content');

    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
    const durationMs = Date.now() - start;

    logger.debug('claude response', { tokensUsed, durationMs, stopReason: message.stop_reason });

    return {
      content: block.text,
      provider: this.name,
      model: this.model,
      tokensUsed,
      durationMs,
      truncated: message.stop_reason === 'max_tokens',
    };
  }
}
