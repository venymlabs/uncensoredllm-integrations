# TanStack AI

Tested 2026-11-23 against the live API: `@tanstack/ai` 1.8.0, `@tanstack/ai-openai` 1.2.0, Node 24.19.0. Passed: tool called, answer correct.

Setup: `openaiCompatibleText` from `@tanstack/ai-openai/compatible` (documented in the package's `compatible/index.d.ts`):

```js
openaiCompatibleText('uncensoredllm-1', { name: 'uncensoredllm', baseURL: 'https://uncensoredllm.xyz/v1', apiKey: process.env.UNCENSOREDLLM_API_KEY, api: 'chat-completions' })
```

Reasoning streams as `REASONING_*` events (21 `REASONING_MESSAGE_CONTENT` chunks in the run).

Notes:
- `chat()` in 1.8.0 throws without a `threadId` ("chat() needs a threadId"); older examples omit it.
