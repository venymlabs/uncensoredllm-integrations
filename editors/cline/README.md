# Cline

Cline 4.x (VS Code, JetBrains, the `cline` CLI, the SDK) keeps all provider state in plain JSON under `~/.cline/data/settings/` on every host (`docs/getting-started/config.mdx`). The VS Code extension no longer uses VS Code's secret storage for keys.

## Routes

1. **Native listing (shared with the models.dev entry).** Cline's built-in provider catalog is generated from models.dev: `sdk/packages/llms/src/providers/providers.generated.ts` is written by `bun run build:models` and includes every models.dev provider whose `npm` is a supported AI SDK package (`@ai-sdk/openai-compatible` qualifies; `catalog-live.ts`, `MODELS_DEV_AI_SDK_PROVIDER_FAMILIES`). Small providers such as `abliteratedllm` are already in it. So an entry on models.dev makes UncensoredLLM a named provider in Cline after Cline's next catalog regeneration and release. No separate Cline PR is needed; the entry must use `npm: "@ai-sdk/openai-compatible"`, `api: "https://uncensoredllm.xyz/v1"`, `env: ["UNCENSOREDLLM_API_KEY"]`, and a `doc` URL. Cline will then read the key from `UNCENSOREDLLM_API_KEY` (generated `apiKeyEnv`).
2. **Adapter (works today):** the `cline` adapter in [uncensoredllm-connect](https://github.com/venymlabs/uncensoredllm-connect) writes a user-added OpenAI-compatible provider exactly the way Cline's own "add provider" code does (`addLocalProvider` in `sdk/packages/core/src/services/providers/local-provider-service.ts`): an entry in `models.json` and one in `providers.json`. Output for an empty machine: `example/`.

## Details

- Paths: `CLINE_PROVIDER_SETTINGS_PATH`, else `CLINE_DATA_DIR/settings`, else `CLINE_DIR/data/settings`, else `~/.cline/data/settings` (`sdk/packages/shared/src/storage/paths.ts`).
- The key: a file-defined provider cannot read an environment variable (`registerCustomProvider` passes no `apiKeyEnv`). When the user hands the key to `connect`, it goes into `providers.json`, which is where Cline keeps every key (mode 0600). Otherwise nothing is written and the step says `cline auth -p uncensoredllm -k "$UNCENSOREDLLM_API_KEY" -m uncensoredllm-1` or paste it in Settings.
- The user's current provider (`lastUsedProvider`, and the VS Code `actModeApiProvider`) is not switched; they pick UncensoredLLM in the provider list, which is built from the live catalog including file-defined providers (`webview-ui/src/components/settings/ApiOptions.tsx`).
- Invalid JSON in either file: nothing is written (Cline itself would treat it as empty and could drop the user's keys).

## Verified against

- Source: cline/cline@8075d2e35cf5cad67c24f180c80a05d311b74a3e (extension 4.1.27, CLI 3.0.75): the zod schemas `StoredModelsFileSchema`, `StoredProviderSettingsSchema`, `ProviderSettingsSchema`, and the files named above.
- Adapter tests: `adapters/cline.test.mjs` in that repository.
- Not run: no editor here; running the `cline` CLI in a sandboxed home was refused by this session's permission check. The live API answered a streamed tool-call turn shaped like Cline's.
