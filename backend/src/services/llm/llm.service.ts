import { ILLMProvider, LLMRequest, LLMResponse, LLMTask, ProviderId } from './llm.interface';
import { createAdapter } from './llm.factory';
import { getActiveProvider } from './llm.config';
import { UnprocessableError } from '../../utils/errors';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// LLMService — the single entry point for all LLM calls.
//
//   const response = await LLMService.complete('keywords', { systemPrompt, userPrompt });
//
// `task` is a log label so token spend can be traced back to a call site.
// Pass `{ provider }` to pin a call to one provider (menu extraction → Claude).
// ---------------------------------------------------------------------------

export class LLMService {
  private static cache = new Map<ProviderId, ILLMProvider>();

  static getAdapter(id: ProviderId = getActiveProvider()): ILLMProvider {
    let adapter = LLMService.cache.get(id);
    if (!adapter) {
      adapter = createAdapter(id);
      LLMService.cache.set(id, adapter);
    }
    return adapter;
  }

  static async complete(
    task: LLMTask,
    request: LLMRequest,
    opts: { provider?: ProviderId } = {},
  ): Promise<LLMResponse> {
    const adapter = LLMService.getAdapter(opts.provider ?? getActiveProvider());

    if (request.images?.length && !adapter.supportsImages) {
      throw new UnprocessableError(`${adapter.name} does not support image input`);
    }

    logger.debug('LLM request', { task, provider: adapter.name, model: adapter.model });
    const response = await adapter.complete(request);
    logger.debug('LLM response', {
      task,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      durationMs: response.durationMs,
      truncated: response.truncated,
    });

    return response;
  }

  static resetCache(): void {
    LLMService.cache.clear();
  }
}
