# Mastra

Tested 2026-11-23 against the live API: `@mastra/core` 1.85.0, Node 24.19.0.

Two routes, both ran end to end (tool called, answer correct):

1. **No extra package** (`agent.mjs`): Mastra's OpenAI-compatible model config.
   ```js
   model: { id: 'uncensoredllm/uncensoredllm-1', url: 'https://uncensoredllm.xyz/v1', apiKey: process.env.UNCENSOREDLLM_API_KEY }
   ```
2. **The AI SDK provider** (`agent-provider.mjs`): `model: uncensoredllm('uncensoredllm-1')` from `@uncensoredllm/ai-sdk-provider`. Mastra 1.85 accepts AI SDK specification v2, v3 and v4 models, so the main (ai 7) entry works. Streams reasoning as `reasoning-delta` chunks and passes `providerOptions.uncensoredllm.reasoningMode`.

**Native listing (once models.dev has us):** Mastra's model router builds its `provider/model` catalog from https://models.dev/api.json (source: `ModelsDevGateway.fetchProviders` in `@mastra/core` 1.85.0, it keeps providers whose `npm` is `@ai-sdk/openai-compatible` or that have `api` and `env`). An entry on models.dev has `npm = "@ai-sdk/openai-compatible"`, `api` and `env = ["UNCENSOREDLLM_API_KEY"]`, so after it is merged and Mastra regenerates its registry, `model: 'uncensoredllm/uncensoredllm-1'` should work by name with only the env var set. Read from source, not run.
