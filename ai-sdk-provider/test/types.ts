// Compile-only: checks that the provider type-checks against the `ai` package's own types.
import { generateText, streamText, tool, stepCountIs, type LanguageModel } from 'ai';
import { z } from 'zod';
import { createUncensoredLLM, uncensoredllm, type UncensoredLLMProviderOptions } from '../src/index.js';

const model: LanguageModel = uncensoredllm('uncensoredllm-1');
const custom = createUncensoredLLM({ apiKey: 'vk-test', baseURL: 'https://example.invalid/v1', minOutputTokens: 0 });

import { generateText as generateText6, type LanguageModel as LanguageModel6 } from 'ai-v6';
import { uncensoredllm as uncensoredllm6 } from '../src/v6.js';
const model6: LanguageModel6 = uncensoredllm6('uncensoredllm-1');

export async function typecheck() {
  await generateText6({ model: model6, prompt: 'hi', providerOptions: { uncensoredllm: { reasoningMode: 'fast' } } });
  await generateText({
    model,
    prompt: 'hi',
    providerOptions: { uncensoredllm: { reasoningMode: 'fast' } satisfies UncensoredLLMProviderOptions },
  });
  streamText({
    model: custom(),
    prompt: 'hi',
    tools: { add: tool({ description: 'add', inputSchema: z.object({ a: z.number() }), execute: async ({ a }) => a + 1 }) },
    stopWhen: stepCountIs(3),
  });
}
