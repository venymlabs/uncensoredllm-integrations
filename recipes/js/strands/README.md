# Strands Agents (TypeScript SDK)

Tested 2026-11-23 against the live API: `@strands-agents/sdk` 1.26.0, `openai` 6.49.0, Node 24.19.0. Passed: tool called, answer correct.

Setup (from the package's `models/openai` types):

```js
new OpenAIModel({ api: 'chat', modelId: 'uncensoredllm-1', apiKey: process.env.UNCENSOREDLLM_API_KEY, clientConfig: { baseURL: 'https://uncensoredllm.xyz/v1' } })
```

Notes:
- The Chat Completions adapter does not read `reasoning_content`, so the model's reasoning is not surfaced (no reasoning block in the run). The answer is unaffected.
- The SDK also has `@strands-agents/sdk/models/vercel`, which wraps an AI SDK model; its peer is `@ai-sdk/provider` ^3, so it would take the `/v6` entry of the provider package. Not run.
