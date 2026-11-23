# VoltAgent

Tested 2026-11-23 against the live API: `@voltagent/core` 2.11.1 (which bundles `ai` 6.0.336), Node 24.19.0.

| Script | Model | Result |
|---|---|---|
| `agent-provider-v6.mjs` | `@uncensoredllm/ai-sdk-provider/v6` | passed |
| `agent.mjs` | `@ai-sdk/openai-compatible` 2.0.94 | passed |
| `agent-provider-v4.mjs` | `@uncensoredllm/ai-sdk-provider` main entry (spec v4) | **rejected**: `AI_UnsupportedModelVersionError ... AI SDK 5 only supports models that implement specification version "v2"` (the message's "AI SDK 5" wording comes from ai 6.0.336 itself) |

Findings:
- VoltAgent 2.x runs on `ai` 6, so it needs a specification v3 model. That is why the provider package ships a `/v6` entry.
- After `generateText` returns, VoltAgent keeps the process alive (background handles); a script must call `process.exit()`.
- VoltAgent also builds its `provider/model` registry from https://models.dev/api.json (`fetchModelsDevRegistry` in `@voltagent/core` 2.11.1, refreshed every 30 minutes). Once an entry is merged into models.dev, `model: 'uncensoredllm/uncensoredllm-1'` should resolve by name. Read from source, not run.
