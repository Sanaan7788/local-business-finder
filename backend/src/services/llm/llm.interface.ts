// ---------------------------------------------------------------------------
// LLM Abstraction Layer — Core Interfaces
//
// Every provider adapter implements ILLMProvider.
// All LLM calls flow through LLMRequest → adapter → LLMResponse.
// Services never import a concrete adapter — only this interface.
// ---------------------------------------------------------------------------

export interface LLMImageInput {
  base64: string;          // base64-encoded image data
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;   // 0.0–1.0, default varies per adapter
  maxTokens?: number;     // default varies per adapter
  jsonMode?: boolean;     // hint to return valid JSON (supported by some providers)
  images?: LLMImageInput[]; // optional images for vision requests (Claude only)
}

export interface LLMResponse {
  content: string;        // raw text output from the model
  provider: string;       // e.g. "deepseek", "claude", "openai"
  model: string;          // exact model ID used
  tokensUsed?: number;    // total tokens consumed (input + output)
  durationMs?: number;    // wall-clock time for the API call
}

export interface ILLMProvider {
  readonly name: string;  // provider identifier, matches LLM_PROVIDER env value
  readonly model: string; // model ID in use
  complete(request: LLMRequest): Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// Task names — used by LLMService to select provider + prompt per task.
// Adding a new task = add a value here + a prompt file + a case in LLMService.
// ---------------------------------------------------------------------------

export type LLMTask =
  | 'keywords'
  | 'summary'
  | 'businessContext'
  | 'insights'
  | 'contentBrief'
  | 'websiteGeneration'
  | 'websiteStructure'
  | 'websiteAnalysis'
  | 'outreach'
  | 'outreachEmail'
  | 'menuExtraction';
