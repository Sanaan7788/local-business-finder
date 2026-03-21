import { LLMTask } from './llm.interface';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// Task → Provider mapping
//
// Defines which LLM provider handles each task type.
// If a task has no override here, the default provider (LLM_PROVIDER env) is used.
//
// To route a specific task to a different provider:
//   taskProviderMap['websiteGeneration'] = 'claude';
// ---------------------------------------------------------------------------

export type TaskProviderMap = Partial<Record<LLMTask, string>>;

// Default task overrides — customise per deployment via env or here directly.
// Currently all tasks use the default provider; add overrides as needed.
export const taskProviderMap: TaskProviderMap = {
  // Example overrides (uncomment to activate):
  // websiteGeneration: 'claude',
  // keywords: 'deepseek',
};

// The fallback provider when a task has no override.
export function getProviderForTask(task: LLMTask): string {
  return taskProviderMap[task] ?? config.llm.provider;
}
