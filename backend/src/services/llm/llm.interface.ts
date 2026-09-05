// ---------------------------------------------------------------------------
// LLM Abstraction Layer — Core Interfaces
//
// Every provider adapter implements ILLMProvider.
// All LLM calls flow through LLMRequest → adapter → LLMResponse.
// Services never import a concrete adapter — only LLMService.
// This module is dependency-free so config/env.ts can import PROVIDER_IDS.
// ---------------------------------------------------------------------------

export const PROVIDER_IDS = ['deepseek', 'claude', 'openai', 'gemini', 'mistral', 'groq'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface LLMImageInput {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;     // 0.0–1.0, default 0.6
  maxTokens?: number;       // default 4096
  images?: LLMImageInput[]; // vision requests — only adapters with supportsImages accept these
}

export interface LLMResponse {
  content: string;
  provider: ProviderId;
  model: string;
  tokensUsed?: number;   // input + output, when the provider reports it
  durationMs?: number;
  truncated?: boolean;   // output hit maxTokens
}

export interface ILLMProvider {
  readonly name: ProviderId;
  readonly model: string;
  readonly supportsImages: boolean;
  complete(request: LLMRequest): Promise<LLMResponse>;
}

// Task labels — used for logging so token spend can be traced to a call site.
export type LLMTask =
  | 'keywords'
  | 'summary'
  | 'businessContext'
  | 'insights'
  | 'contentBrief'
  | 'websiteGeneration'
  | 'websiteStructure'
  | 'websiteAnalysis'
  | 'outreachEmail'
  | 'menuExtraction';
