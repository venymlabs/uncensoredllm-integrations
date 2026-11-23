# Genkit (JavaScript)

Tested 2026-11-23 against the live API: `genkit` 1.44.0, `@genkit-ai/compat-oai` 1.44.0 (which bundles `openai` 4.104.0), Node 24.19.0. Passed: tool called, answer correct, reasoning returned in `res.reasoning`.

Setup (from the plugin source, `@genkit-ai/compat-oai/lib/index.mjs` and its `PluginOptions` type; the docs site was not read):

```js
genkit({ plugins: [openAICompatible({ name: 'uncensoredllm', apiKey: process.env.UNCENSOREDLLM_API_KEY, baseURL: 'https://uncensoredllm.xyz/v1' })] })
// model: 'uncensoredllm/uncensoredllm-1'
```

The plugin resolves any `uncensoredllm/<id>` on demand; no model list is needed.

Notes:
- The plugin's `openai` 4.x uses its own fetch; `agent.mjs` passes the global `fetch` instead; that is optional.
- Without `apiKey` the plugin reads `OPENAI_API_KEY`, not ours: pass the key explicitly.
