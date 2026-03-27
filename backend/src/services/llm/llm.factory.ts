import { ILLMProvider } from './llm.interface';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// LLMFactory
//
// Returns the correct ILLMProvider adapter based on the provider name.
// Adding a new provider:
//   1. Create the adapter in ./adapters/<name>.adapter.ts
//   2. Add a case below
//   3. Set LLM_PROVIDER=<name> in .env
// ---------------------------------------------------------------------------

export class LLMFactory {
  static create(provider?: string): ILLMProvider {
    const name = provider ?? config.llm.provider;

    switch (name) {
      case 'deepseek': {
        const { DeepSeekAdapter } = require('./adapters/deepseek.adapter');
        return new DeepSeekAdapter();
      }
      case 'claude': {
        const { ClaudeAdapter } = require('./adapters/claude.adapter');
        return new ClaudeAdapter();
      }
      case 'openai': {
        const { OpenAIAdapter } = require('./adapters/openai.adapter');
        return new OpenAIAdapter();
      }
      case 'gemini': {
        const { GeminiAdapter } = require('./adapters/gemini.adapter');
        return new GeminiAdapter();
      }
      case 'mistral': {
        const { MistralAdapter } = require('./adapters/mistral.adapter');
        return new MistralAdapter();
      }
      case 'groq': {
        const { GroqAdapter } = require('./adapters/groq.adapter');
        return new GroqAdapter();
      }
      default:
        throw new Error(
          `Unknown LLM provider: "${name}". ` +
          `Supported: deepseek, claude, openai, gemini, mistral, groq. ` +
          `Set LLM_PROVIDER in .env.`
        );
    }
  }
}
