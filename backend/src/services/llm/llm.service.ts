import { ILLMProvider, LLMRequest, LLMResponse, LLMTask } from './llm.interface';
import { LLMFactory } from './llm.factory';
import { getProviderForTask } from './llm.config';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// LLMService
//
// The single entry point for all LLM calls in the application.
// Services call complete() with a task name — never an adapter directly.
//
// Usage:
//   const response = await LLMService.complete('keywords', {
//     systemPrompt: '...',
//     userPrompt: '...',
//   });
// ---------------------------------------------------------------------------

export class LLMService {
  // Cache adapters so we don't re-instantiate on every call.
  private static cache = new Map<string, ILLMProvider>();

  private static getAdapter(providerName: string): ILLMProvider {
    if (!LLMService.cache.has(providerName)) {
      LLMService.cache.set(providerName, LLMFactory.create(providerName));
    }
    return LLMService.cache.get(providerName)!;
  }

  /**
   * Run an LLM request for a given task.
   * Provider is selected by task config, falling back to LLM_PROVIDER env.
   */
  static async complete(task: LLMTask, request: LLMRequest): Promise<LLMResponse> {
    const providerName = getProviderForTask(task);
    const adapter = LLMService.getAdapter(providerName);

    logger.debug('LLMService dispatch', {
      task,
      provider: adapter.name,
      model: adapter.model,
    });

    const response = await adapter.complete(request);

    logger.debug('LLMService response', {
      task,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      durationMs: response.durationMs,
    });

    return response;
  }

  /**
   * Returns which provider will handle a given task (useful for logging/UI).
   */
  static providerForTask(task: LLMTask): string {
    return getProviderForTask(task);
  }

  /**
   * Clears the adapter cache — useful in tests to reset state between runs.
   */
  static resetCache(): void {
    LLMService.cache.clear();
  }
}
