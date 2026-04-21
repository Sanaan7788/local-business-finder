import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMRequest, LLMResponse, LLMImageInput } from '../llm.interface';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// ClaudeAdapter
//
// Anthropic Claude via the official SDK.
// Model switchable via CLAUDE_MODEL env var:
//   claude-sonnet-4-6  (default, latest)
//   claude-sonnet-3-5  (older, cheaper)
// ---------------------------------------------------------------------------

export class ClaudeAdapter implements ILLMProvider {
  readonly name = 'claude';
  readonly model: string;

  private client: Anthropic;

  constructor() {
    this.model = config.llm.claudeModel;

    if (!config.llm.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in .env');
    }

    this.client = new Anthropic({ apiKey: config.llm.anthropicApiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    logger.debug('Claude request', {
      model: this.model,
      systemLen: request.systemPrompt.length,
      userLen: request.userPrompt.length,
    });

    // Build user content — plain text or text + images for vision requests
    type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;
    const userContent: ContentBlock[] = [];

    if (request.images && request.images.length > 0) {
      for (const img of request.images) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
        });
      }
    }
    userContent.push({ type: 'text', text: request.userPrompt });

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.6,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error(`Unexpected Claude response block type: ${block.type}`);
    }

    const durationMs = Date.now() - start;

    logger.debug('Claude response', {
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      durationMs,
      stopReason: message.stop_reason,
    });

    return {
      content: block.text,
      provider: this.name,
      model: this.model,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      durationMs,
    };
  }
}
