import { loadApiKey, loadOptionalSetting, withoutTrailingSlash, withUserAgentSuffix } from '@ai-sdk/provider-utils';
import {
  UNCENSOREDLLM_API_KEY_ENV,
  UNCENSOREDLLM_BASE_URL_ENV,
  UNCENSOREDLLM_DEFAULT_BASE_URL,
  UNCENSOREDLLM_MIN_OUTPUT_TOKENS,
} from './uncensoredllm-options.js';
import { VERSION } from './version.js';
import type { UncensoredLLMProviderOptions } from './uncensoredllm-options.js';

export type { UncensoredLLMProviderOptions };

export interface UncensoredLLMProviderSettings {
  /** API key (`vk-...`). Defaults to the `UNCENSOREDLLM_API_KEY` environment variable. */
  apiKey?: string;
  /**
   * Base URL of the API. Defaults to `UNCENSOREDLLM_BASE_URL` if set,
   * else `https://uncensoredllm.xyz/v1`.
   */
  baseURL?: string;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Custom fetch, for middleware or tests. */
  fetch?: typeof globalThis.fetch;
  /**
   * Smallest `max_tokens` sent to the API. The model reasons before it answers, and a
   * smaller cap can be used up by reasoning (the API then answers 502 `empty_completion`).
   * Default 512. Set 0 to send whatever `maxOutputTokens` you pass.
   */
  minOutputTokens?: number;
  /** Ask for token usage in streams (`stream_options.include_usage`). Default true. */
  includeUsage?: boolean;
}

/** Resolve settings shared by both entry points. */
export function resolveSettings(options: UncensoredLLMProviderSettings) {
  const baseURL = withoutTrailingSlash(
    loadOptionalSetting({ settingValue: options.baseURL, environmentVariableName: UNCENSOREDLLM_BASE_URL_ENV }) ??
      UNCENSOREDLLM_DEFAULT_BASE_URL,
  )!;
  const minOutputTokens = options.minOutputTokens ?? UNCENSOREDLLM_MIN_OUTPUT_TOKENS;
  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: UNCENSOREDLLM_API_KEY_ENV,
          description: 'UncensoredLLM',
        })}`,
        ...options.headers,
      },
      `ai-sdk/uncensoredllm/${VERSION}`,
    );
  return { baseURL, minOutputTokens, getHeaders };
}

