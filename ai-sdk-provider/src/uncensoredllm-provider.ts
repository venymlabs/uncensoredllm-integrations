// Entry point for ai 7.x (provider specification v4).
import { NoSuchModelError, type LanguageModelV4, type ProviderV4 } from '@ai-sdk/provider';
import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import { UNCENSOREDLLM_DEFAULT_MODEL, type UncensoredLLMChatModelId } from './uncensoredllm-options.js';
import { resolveSettings, type UncensoredLLMProviderSettings } from './settings.js';
import { transformUncensoredLLMRequestBody } from './transform.js';

export type { UncensoredLLMProviderSettings };
export { transformUncensoredLLMRequestBody };

export interface UncensoredLLMProvider extends ProviderV4 {
  /** The chat model, e.g. `uncensoredllm('uncensoredllm-1')`. With no id, uses `uncensoredllm-1`. */
  (modelId?: UncensoredLLMChatModelId): LanguageModelV4;
  languageModel(modelId: UncensoredLLMChatModelId): LanguageModelV4;
  chatModel(modelId: UncensoredLLMChatModelId): LanguageModelV4;
  /** Not served: throws `NoSuchModelError`. */
  embeddingModel(modelId: string): never;
  /** Not served: throws `NoSuchModelError`. */
  imageModel(modelId: string): never;
}

/** Create an UncensoredLLM provider instance (ai 7.x). */
export function createUncensoredLLM(options: UncensoredLLMProviderSettings = {}): UncensoredLLMProvider {
  const { baseURL, minOutputTokens, getHeaders } = resolveSettings(options);

  const createChatModel = (modelId: UncensoredLLMChatModelId = UNCENSOREDLLM_DEFAULT_MODEL): LanguageModelV4 =>
    new OpenAICompatibleChatLanguageModel(modelId, {
      provider: 'uncensoredllm.chat',
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      includeUsage: options.includeUsage ?? true,
      supportsStructuredOutputs: true,
      transformRequestBody: (args, warnings) => transformUncensoredLLMRequestBody(args, warnings, minOutputTokens),
    });

  const provider = function (modelId?: UncensoredLLMChatModelId) {
    if (new.target) throw new Error('The UncensoredLLM model function cannot be called with the new keyword.');
    return createChatModel(modelId);
  } as UncensoredLLMProvider;

  (provider as { specificationVersion: 'v4' }).specificationVersion = 'v4';
  provider.languageModel = createChatModel;
  provider.chatModel = createChatModel;
  provider.embeddingModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'embeddingModel', message: 'UncensoredLLM does not serve embeddings.' });
  };
  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'imageModel', message: 'UncensoredLLM does not serve images.' });
  };
  return provider;
}

/** Default instance: key from `UNCENSOREDLLM_API_KEY`, base URL `https://uncensoredllm.xyz/v1`. */
export const uncensoredllm = createUncensoredLLM();
