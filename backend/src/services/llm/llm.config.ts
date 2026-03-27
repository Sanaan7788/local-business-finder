import { LLMTask } from './llm.interface';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// Runtime provider — can be changed via POST /api/settings/llm without restart.
// Falls back to LLM_PROVIDER env value on startup.
// ---------------------------------------------------------------------------

let _activeProvider: string = config.llm.provider;

export function getActiveProvider(): string {
  return _activeProvider;
}

export function setActiveProvider(provider: string): void {
  _activeProvider = provider;
}

// The fallback provider when a task has no override.
export function getProviderForTask(_task: LLMTask): string {
  return _activeProvider;
}

// ---------------------------------------------------------------------------
// All known providers and their configured state
// ---------------------------------------------------------------------------

export interface ProviderInfo {
  id: string;
  label: string;
  model: string;
  configured: boolean;
  free?: string; // free tier note if any
}

export function getAllProviders(): ProviderInfo[] {
  return [
    {
      id: 'deepseek',
      label: 'DeepSeek',
      model: config.llm.deepseekModel,
      configured: Boolean(config.llm.deepseekApiKey),
      free: 'Paid (NVIDIA NIM)',
    },
    {
      id: 'claude',
      label: 'Claude (Anthropic)',
      model: config.llm.claudeModel,
      configured: Boolean(config.llm.anthropicApiKey),
      free: 'Paid',
    },
    {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-4.1',
      configured: Boolean(config.llm.openaiApiKey),
      free: 'Paid',
    },
    {
      id: 'gemini',
      label: 'Gemini (Google)',
      model: 'gemini-2.0-flash',
      configured: Boolean(config.llm.geminiApiKey),
      free: 'Free tier available',
    },
    {
      id: 'mistral',
      label: 'Mistral',
      model: 'mistral-large-latest',
      configured: Boolean(config.llm.mistralApiKey),
      free: 'Free tier available',
    },
    {
      id: 'groq',
      label: 'Groq',
      model: 'llama-3.3-70b-versatile',
      configured: Boolean(config.llm.groqApiKey),
      free: 'Free tier available',
    },
  ];
}
