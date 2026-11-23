// Entry point for ai 6.x (provider specification v3): `@uncensoredllm/ai-sdk-provider/v6`.
// Same settings and behaviour as the main entry, built on @ai-sdk/openai-compatible 2.x.
import { NoSuchModelError, type LanguageModelV3, type ProviderV3 } from '@ai-sdk/provider-v3';
import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible-v2';
import { UNCENSOREDLLM_DEFAULT_MODEL, type UncensoredLLMChatModelId } from './uncensoredllm-options.js';
import { resolveSettings, type UncensoredLLMProviderSettings } from './settings.js';
import { transformUncensoredLLMRequestBody } from './transform.js';

export * from './uncensoredllm-options.js';
export { transformUncensoredLLMRequestBody } from './transform.js';
export type { UncensoredLLMProviderSettings };
export { VERSION } from './version.js';

export interface UncensoredLLMProvider extends ProviderV3 {
  (modelId?: UncensoredLLMChatModelId): LanguageModelV3;
  languageModel(modelId: UncensoredLLMChatModelId): LanguageModelV3;
  chatModel(modelId: UncensoredLLMChatModelId): LanguageModelV3;
  embeddingModel(modelId: string): never;
  imageModel(modelId: string): never;
}

/** Create an UncensoredLLM provider instance (ai 6.x). */
export function createUncensoredLLM(options: UncensoredLLMProviderSettings = {}): UncensoredLLMProvider {
  const { baseURL, minOutputTokens, getHeaders } = resolveSettings(options);

  const createChatModel = (modelId: UncensoredLLMChatModelId = UNCENSOREDLLM_DEFAULT_MODEL): LanguageModelV3 =>
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

  (provider as { specificationVersion: 'v3' }).specificationVersion = 'v3';
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

/** Default instance for ai 6.x. */
export const uncensoredllm = createUncensoredLLM();
