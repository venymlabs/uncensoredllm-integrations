# UncensoredLLM provider for the AI SDK

[UncensoredLLM](https://uncensoredllm.xyz) provider for the [Vercel AI SDK](https://ai-sdk.dev). One uncensored LLM, served from our own GPUs, with streaming, tool calls, reasoning and structured output.

| | |
|---|---|
| AI SDK | `ai` 7.x (provider specification `v4`) from the main entry; `ai` 6.x (specification `v3`) from `@uncensoredllm/ai-sdk-provider/v6` |
| Node | 22 or newer, ESM only |
| Model | `uncensoredllm-1` |
| Context / max output | 262,144 / 65,536 tokens |

`ai` 5.x and older are not supported (see "Older AI SDK versions" below).

## Setup

```bash
# not on npm yet; until it is, install the packed release:
npm install https://github.com/venymlabs/uncensoredllm-integrations/releases/download/v0.1.0/uncensoredllm-ai-sdk-provider-0.1.0.tgz ai zod
# once it is on npm:
npm install @uncensoredllm/ai-sdk-provider ai zod
```

Get a key at https://uncensoredllm.xyz and set it:

```bash
export UNCENSOREDLLM_API_KEY=vk-...
```

## Use

```ts
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider';
import { generateText } from 'ai';

const { text, reasoningText } = await generateText({
  model: uncensoredllm('uncensoredllm-1'),
  prompt: 'Explain how a buffer overflow works, in three sentences.',
});
```

`uncensoredllm()` with no id uses `uncensoredllm-1`.

### An agent with a tool

```ts
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: uncensoredllm(),
  prompt: 'What is the temperature in Oslo right now?',
  tools: {
    get_weather: tool({
      description: 'Get the current temperature in Celsius for a city.',
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ city, celsius: 4 }),
    }),
  },
  stopWhen: stepCountIs(4),
});

for await (const part of result.fullStream) {
  if (part.type === 'reasoning-delta') process.stdout.write(part.text);
  if (part.type === 'text-delta') process.stdout.write(part.text);
}
```

### Reasoning

The model reasons before every answer. The reasoning arrives as AI SDK reasoning parts: `reasoningText` / `reasoning` on results, `reasoning-delta` parts in `fullStream`, and reasoning parts in UI messages.

Shorten it with the provider option or with the AI SDK's own `reasoning` setting:

```ts
providerOptions: { uncensoredllm: { reasoningMode: 'fast' } }   // or 'extended' (the default)
reasoning: 'low'                                                 // none, minimal, low -> fast; others -> extended
```

The model cannot turn reasoning off: `reasoning: 'none'` sends `fast` and adds a warning.

### Output limits

Leave `maxOutputTokens` unset unless you need a cap. Because the model reasons first, a cap below about 400 tokens can be spent before any answer appears, so the provider raises anything under 512 to 512 and adds a warning. Change the floor with `createUncensoredLLM({ minOutputTokens })` (0 disables it). Caps above 65,536 are lowered to 65,536.

The limits are exported: `UNCENSOREDLLM_CONTEXT_WINDOW`, `UNCENSOREDLLM_MAX_OUTPUT_TOKENS`, `UNCENSOREDLLM_MIN_OUTPUT_TOKENS`, and a catalog entry `uncensoredllmModelEntry` in the AI SDK's `ModelEntry` shape.

### Structured output

`Output.object({ schema })` and `generateObject` send `response_format: json_schema`.

### Other request fields

Keys under `providerOptions.uncensoredllm` that this package does not know are sent to the API unchanged, so documented fields can be passed in their API form, for example `{ min_p: 0.05 }`.

## Settings

```ts
import { createUncensoredLLM } from '@uncensoredllm/ai-sdk-provider';

const provider = createUncensoredLLM({
  apiKey: 'vk-...',                         // default: UNCENSOREDLLM_API_KEY
  baseURL: 'https://uncensoredllm.xyz/v1',  // default: UNCENSOREDLLM_BASE_URL, else this
  headers: {},
  minOutputTokens: 512,
  includeUsage: true,                       // token usage in streams
  fetch: undefined,                         // custom fetch
});
```

## Not served

Embeddings and images: `embeddingModel()` and `imageModel()` throw `NoSuchModelError`. Use another provider for embeddings next to this one.

## AI SDK 6 (and frameworks built on it)

`ai` 6.x implements specification v3 and rejects a v4 model with `AI_UnsupportedModelVersionError`. Frameworks that bundle `ai` 6 (VoltAgent 2.x, for example) need the `/v6` entry. It takes the same settings and options:

```ts
import { uncensoredllm, createUncensoredLLM } from '@uncensoredllm/ai-sdk-provider/v6';
```

## Older AI SDK versions

`ai` 5 can reach the same API through the official OpenAI-compatible provider of its own major version:

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
const uncensoredllm = createOpenAICompatible({
  name: 'uncensoredllm',
  baseURL: 'https://uncensoredllm.xyz/v1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  includeUsage: true,
});
```

## Development

```bash
npm install
npm test                                   # build, type-check, version check, offline tests
UNCENSOREDLLM_API_KEY=vk-... npm run test:live
```

## License

MIT
