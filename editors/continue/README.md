# Continue

Continue made a final 2.0 release of its VS Code extension, JetBrains plugin and CLI and set its repository to read-only (README of continuedev/continue; the VS Code release is dated 2026-06-19). It still has 4.6M Marketplace installs and keeps working with a local `config.yaml`, so it gets an adapter, but no listing: Continue Hub contributions have no maintained target any more.

## Route: adapter

The `continue` adapter in [uncensoredllm-connect](https://github.com/venymlabs/uncensoredllm-connect) adds one model to `~/.continue/config.yaml` (or `$CONTINUE_GLOBAL_DIR/config.yaml`, `core/util/paths.ts`):

```yaml
- name: UncensoredLLM 1
  provider: openai
  model: uncensoredllm-1
  apiBase: https://uncensoredllm.xyz/v1
  apiKey: ${{ secrets.UNCENSOREDLLM_API_KEY }}
  roles: [chat, edit, apply]
  capabilities: [tool_use]
  defaultCompletionOptions: { contextLength: 262144, maxTokens: 16384 }
```

- `${{ secrets.NAME }}` is looked up in `~/.continue/.env`, then the workspace `.continue/.env` and `.env`, then the process environment (`core/config/yaml/LocalPlatformClient.ts`). When the user hands the key to `connect`, it goes into `~/.continue/.env`, never into `config.yaml`.
- `tool_use` is what Agent mode needs; no `embed` or `autocomplete` role, since only chat is served.
- Comments and other models are kept (`yaml` Document API). A second run replaces the model in place.
- A setup that still has only the old `config.json`: nothing is written, because a new `config.yaml` would make Continue stop reading `config.json` (`getConfigYamlPath`).

Output for an empty machine: `example/config.yaml`.

## Verified against

- Source: continuedev/continue@5522c6f44ca0ac3528b37244818fbfa39b5af470: `packages/config-yaml/src/schemas/models.ts`, `core/config/default.ts`, the files above.
- Adapter tests: `adapters/continue.test.mjs` in that repository.
- Not run: no editor here.
