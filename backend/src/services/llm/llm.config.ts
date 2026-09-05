import { config } from '../../config';
import { PROVIDER_IDS, ProviderId } from './llm.interface';

// ---------------------------------------------------------------------------
// Provider table — the single place a provider's label, model, endpoint and
// key live. Drives the adapters, the factory and the settings API.
// ---------------------------------------------------------------------------

// Website generation at 8k output tokens on a slow provider can approach this.
// Both SDKs retry 408/409/429/5xx and timeouts with backoff (maxRetries = 2).
export const LLM_TIMEOUT_MS = 120_000;

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  kind: 'openai-compatible' | 'anthropic';
  model: string;
  apiKey: string;
  baseURL?: string;
  free: string; // pricing note shown in the UI
}

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai-compatible',
    model: config.llm.deepseekModel,
    baseURL: config.llm.deepseekBaseUrl,
    apiKey: config.llm.deepseekApiKey,
    free: 'Paid (NVIDIA NIM)',
  },
  claude: {
    id: 'claude',
    label: 'Claude (Anthropic)',
    kind: 'anthropic',
    model: config.llm.claudeModel,
    apiKey: config.llm.anthropicApiKey,
    free: 'Paid',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compatible',
    model: 'gpt-4.1',
    apiKey: config.llm.openaiApiKey,
    free: 'Paid',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    kind: 'openai-compatible',
    model: 'gemini-2.0-flash',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: config.llm.geminiApiKey,
    free: 'Free tier available',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    kind: 'openai-compatible',
    model: 'mistral-large-latest',
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: config.llm.mistralApiKey,
    free: 'Free tier available',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    kind: 'openai-compatible',
    model: 'llama-3.3-70b-versatile',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: config.llm.groqApiKey,
    free: 'Free tier available',
  },
};

// Shape returned by GET /api/settings/llm
export interface ProviderInfo {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
  free: string;
}

export function getAllProviders(): ProviderInfo[] {
  return PROVIDER_IDS.map((id) => {
    const p = PROVIDERS[id];
    return { id, label: p.label, model: p.model, configured: Boolean(p.apiKey), free: p.free };
  });
}

// Runtime-switchable active provider (POST /api/settings/llm). In-memory only:
// it falls back to LLM_PROVIDER on restart, which the frontend re-applies.
let _active: ProviderId = config.llm.provider;

export function getActiveProvider(): ProviderId {
  return _active;
}

export function setActiveProvider(id: ProviderId): void {
  _active = id;
}
