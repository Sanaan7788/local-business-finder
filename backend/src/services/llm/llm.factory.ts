import { ILLMProvider, ProviderId } from './llm.interface';
import { PROVIDERS } from './llm.config';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';

// Adding a provider: add a row to PROVIDERS in llm.config.ts. If it speaks the
// OpenAI protocol nothing else is needed; otherwise add an adapter + a `kind`.
export function createAdapter(id: ProviderId): ILLMProvider {
  const spec = PROVIDERS[id];
  return spec.kind === 'anthropic' ? new ClaudeAdapter(spec) : new OpenAICompatibleAdapter(spec);
}
