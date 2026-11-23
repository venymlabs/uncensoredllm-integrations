import { UNCENSOREDLLM_MAX_OUTPUT_TOKENS } from './uncensoredllm-options.js';

/** The warning shape shared by specification v3 and v4 ("compatibility" exists in both). */
type CompatWarning = { type: 'compatibility'; feature: string; details?: string };

const FAST = new Set(['none', 'minimal', 'low']);

/**
 * Map request fields this provider adds onto what the API reads. Shared by the ai 7 (v4)
 * and ai 6 (v3) entry points. Pure apart from pushing warnings; safe to apply twice.
 */
export function transformUncensoredLLMRequestBody(
  args: Record<string, any>,
  warnings: { push(w: CompatWarning): unknown } | undefined,
  minOutputTokens: number,
): Record<string, any> {
  const body: Record<string, any> = { ...args };

  // providerOptions.uncensoredllm.reasoningMode -> reasoning_mode
  if (body.reasoningMode !== undefined) {
    if (body.reasoning_mode === undefined) body.reasoning_mode = body.reasoningMode;
    delete body.reasoningMode;
  }

  // The AI SDK's `reasoning` option (and providerOptions reasoningEffort) arrive as reasoning_effort.
  // The API's own switch is reasoning_mode: none/minimal/low -> fast, anything else -> extended.
  if (body.reasoning_effort !== undefined) {
    const effort = body.reasoning_effort;
    delete body.reasoning_effort;
    if (body.reasoning_mode === undefined && typeof effort === 'string') {
      body.reasoning_mode = FAST.has(effort) ? 'fast' : 'extended';
      if (effort === 'none') {
        warnings?.push({
          type: 'compatibility',
          feature: 'reasoning: none',
          details: 'uncensoredllm-1 always reasons; sent reasoning_mode "fast", the shortest setting.',
        });
      }
    }
  }

  if (typeof body.max_tokens === 'number') {
    if (minOutputTokens > 0 && body.max_tokens < minOutputTokens) {
      warnings?.push({
        type: 'compatibility',
        feature: 'maxOutputTokens',
        details: `raised from ${body.max_tokens} to ${minOutputTokens}: the model reasons before it answers and a smaller cap can leave no answer. Set minOutputTokens: 0 to disable.`,
      });
      body.max_tokens = minOutputTokens;
    }
    if (body.max_tokens > UNCENSOREDLLM_MAX_OUTPUT_TOKENS) {
      warnings?.push({
        type: 'compatibility',
        feature: 'maxOutputTokens',
        details: `lowered from ${body.max_tokens} to ${UNCENSOREDLLM_MAX_OUTPUT_TOKENS}, the API's largest output.`,
      });
      body.max_tokens = UNCENSOREDLLM_MAX_OUTPUT_TOKENS;
    }
  }
  return body;
}
