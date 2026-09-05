import { UpstreamError } from '../../../utils/errors';

/**
 * Parse the JSON an LLM was asked to return, tolerating markdown fences.
 * Throws UpstreamError (502) when the model returned something unparsable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseLlmJson(raw: string): any {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError('LLM returned invalid JSON');
  }
}
