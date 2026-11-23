# Zed

## Route: adapter

The `zed` adapter in [uncensoredllm-connect](https://github.com/venymlabs/uncensoredllm-connect) adds `language_models.openai_compatible.uncensoredllm` to the user `settings.json` (docs/src/ai/use-api-access.md, "OpenAI-Compatible Endpoints"). Output for an empty machine: `example/settings.json`.

- Path (`crates/paths/src/paths.rs`): macOS `~/.config/zed`, Linux `$FLATPAK_XDG_CONFIG_HOME` or `$XDG_CONFIG_HOME` or `~/.config` + `/zed`, Windows `%APPDATA%\Zed`.
- Model fields (`crates/settings_content/src/language_model.rs`): `name`, `display_name`, `max_tokens` (the context window), `max_output_tokens`, and all seven `capabilities`. `max_tokens_parameter: true` sends `max_tokens`; the API also accepts `max_completion_tokens` (`lib/gateway.ts`). `reasoning_effort` is left unset because the API's own control is `reasoning_mode`.
- The key: Zed reads it from the keychain (entered in Agent Settings) or from `format!("{}_API_KEY", id).to_case(UpperSnake)` (`crates/language_models/src/provider/api_compatible.rs`). The provider id is therefore `uncensoredllm`, which gives `UNCENSOREDLLM_API_KEY`; the id `UncensoredLLM` would give `UNCENSORED_LLM_API_KEY`. The trade-off is that the picker shows the lower-case id.
- Comments and trailing commas in `settings.json` are kept (`jsonc-parser`). `agent.default_model` is not touched.

## Not available

Zed's extension API (v0.8.0 WIT, `crates/extension_api/wit/since_v0.8.0`) has no language-model provider interface yet. The host has a proxy for extension-provided providers (`crates/language_models/src/extension.rs`) but nothing is published for extension authors, so there is no Zed extension to build.

## Verified against

- Source: zed-industries/zed@f62114596325320f5af71399e441cdb76bb9473b, files above.
- Adapter tests: `adapters/zed.test.mjs` in that repository. Zed generates its settings JSON schema at run time, so there is no static file to validate against.
- Not run: no editor here. The live API answered a streamed tool-call turn with `max_tokens` and `parallel_tool_calls: false`.
