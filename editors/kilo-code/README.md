# Kilo Code

Kilo Code 7 (VS Code, JetBrains, `kilo` CLI) is built on OpenCode. The extension runs the same engine as the CLI, so one global config file serves all three.

## Routes

1. **Native listing (best, shared with the models.dev entry).** Kilo loads its built-in provider list from models.dev at runtime (`packages/core/src/models-dev.ts`, `KILO_MODELS_URL` or `https://models.dev`). Once an `uncensoredllm` entry is merged into models.dev, UncensoredLLM appears under Settings > Providers > Connect provider with no release of Kilo needed.
2. **Adapter (works today):** the `kilo-code` adapter in [uncensoredllm-connect](https://github.com/venymlabs/uncensoredllm-connect) adds `provider.uncensoredllm` to the global config. Output for an empty machine: `example/kilo.jsonc`.

## What the adapter writes

- File: the first that exists of `kilo.jsonc`, `kilo.json`, `opencode.jsonc`, `opencode.json`, `config.json` in `$XDG_CONFIG_HOME/kilo` (else `~/.config/kilo`, on Windows too), else a new `kilo.jsonc`. Same order as `globalConfigFile()` in `packages/opencode/src/config/config.ts`.
- Provider: `npm: @ai-sdk/openai-compatible`, `env: ["UNCENSOREDLLM_API_KEY"]`, `options.baseURL`, one model with `tool_call`, `reasoning`, `limit { context: 262144, output: 65536 }`.
- `"model": "uncensoredllm/uncensoredllm-1"` only when the user has no default model.
- Comments and trailing commas are kept (`jsonc-parser`). The key is never written.

## Verified against

- Source: Kilo-Org/kilocode@b0717b91ee02e06e3757d2696a3e340a7b3592a0: `packages/core/src/v1/config/provider.ts` (provider schema), `packages/opencode/src/config/config.ts` (file order), `packages/core/src/global.ts` (xdg paths), `packages/kilo-docs/pages/ai-providers/openai-compatible.md`.
- Published schema: `https://app.kilo.ai/config.json` with ajv: passes, except that `"model"` is an enum of models.dev ids in that schema, so editors underline it until the models.dev listing lands. Kilo's runtime type is any string.
- Adapter tests: `adapters/kilo-code.test.mjs` in that repository.
- Not run: no editor here, and running the `kilo` CLI in a sandboxed home was refused by this session's permission check.

## Caveat

The extension starts Kilo with the editor's environment. On macOS an editor opened from the Dock does not see shell variables; the adapter's steps say to paste the key under Settings > Providers instead.
