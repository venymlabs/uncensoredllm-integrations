import type { ModelEntry } from '@ai-sdk/provider';

/** Model ids served by UncensoredLLM. The service serves one model. */
export type UncensoredLLMChatModelId = 'uncensoredllm-1' | (string & {});

export const UNCENSOREDLLM_DEFAULT_MODEL = 'uncensoredllm-1' as const;
export const UNCENSOREDLLM_DEFAULT_BASE_URL = 'https://uncensoredllm.xyz/v1';
export const UNCENSOREDLLM_API_KEY_ENV = 'UNCENSOREDLLM_API_KEY';
export const UNCENSOREDLLM_BASE_URL_ENV = 'UNCENSOREDLLM_BASE_URL';

/** Context window of uncensoredllm-1, in tokens (prompt + output). */
export const UNCENSOREDLLM_CONTEXT_WINDOW = 262_144;
/** Largest output the API accepts in one response, in tokens. */
export const UNCENSOREDLLM_MAX_OUTPUT_TOKENS = 65_536;
/**
 * The model reasons before it answers. A cap below about 400 tokens can be spent
 * entirely on reasoning and the API then answers 502 `empty_completion`. Requests
 * with a smaller `maxOutputTokens` are raised to this floor (with a warning) unless
 * `minOutputTokens` is set to 0 in the provider settings.
 */
export const UNCENSOREDLLM_MIN_OUTPUT_TOKENS = 512;

/**
 * Options accepted under `providerOptions.uncensoredllm`.
 *
 * Any other key under `providerOptions.uncensoredllm` is sent to the API unchanged,
 * so request fields the API documents (for example `min_p` or `repetition_penalty`)
 * can be passed in their snake_case form.
 */
export type UncensoredLLMProviderOptions = {
  /**
   * How long the model reasons before it answers.
   * `extended` (the API default) reasons fully; `fast` keeps the reasoning short.
   * Sent as `reasoning_mode`.
   */
  reasoningMode?: 'fast' | 'extended';
  /** End-user id, passed to the API as `user`. */
  user?: string;
};

/**
 * Catalog entry for uncensoredllm-1, in the shape of the AI SDK's `ModelEntry`
 * declaration. It documents what the provider exposes; it does not change requests.
 */
export const uncensoredllmModelEntry: ModelEntry<{
  contextWindow: number;
  maxOutputTokens: number;
  minOutputTokens: number;
}> = {
  capabilities: {
    language: {
      inputs: { image: false, audio: false },
      objectGeneration: true,
      tools: { usage: true, streaming: true },
      reasoning: { support: true, efforts: ['fast', 'extended'] },
      sampling: { temperature: true, topP: true, logprobs: 'unknown' },
    },
  },
  requestConfig: {
    contextWindow: UNCENSOREDLLM_CONTEXT_WINDOW,
    maxOutputTokens: UNCENSOREDLLM_MAX_OUTPUT_TOKENS,
    minOutputTokens: UNCENSOREDLLM_MIN_OUTPUT_TOKENS,
  },
};
