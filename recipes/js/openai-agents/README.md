# OpenAI Agents SDK (JavaScript)

Tested 2026-11-23 against the live API: `@openai/agents` 0.22.0 (with `openai` 7.62.0), Node 24.19.0.

| Script | API | Result |
|---|---|---|
| `agent.mjs` | Responses API (`/v1/responses`, the SDK default) | passed; reasoning arrives as `reasoning_item`s |
| `agent-chat.mjs` | Chat Completions (`setOpenAIAPI('chat_completions')`) | passed |

Setup (from the package types, `@openai/agents-openai/dist/defaults.d.ts`; mirrors the Python SDK page the site docs cite):

```js
setDefaultOpenAIClient(new OpenAI({ baseURL: 'https://uncensoredllm.xyz/v1', apiKey: process.env.UNCENSOREDLLM_API_KEY }));
setTracingDisabled(true); // traces upload to OpenAI by default
// model: 'uncensoredllm-1'
```

No incompatibility found.
