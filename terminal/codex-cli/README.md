# Codex CLI

Route: connect adapter `codex-cli`. Codex has no outside provider registry (built-ins are compiled in), so a config file is the strongest route.

The adapter writes one new file, `~/.codex/uncensoredllm.config.toml` (or under `$CODEX_HOME`), and never edits `config.toml`. Codex 0.145 reads it with `codex --profile uncensoredllm` (`--help`: "Layer $CODEX_HOME/<name>.config.toml on top of the base user config"). Contents: `model`, `model_provider`, `model_context_window = 262144` and `[model_providers.uncensoredllm]` with `base_url`, `env_key = "UNCENSOREDLLM_API_KEY"`, `env_key_instructions`, `wire_api = "responses"` (the only value Codex accepts now; `"chat"` was removed).

Notes from the live runs (0.145.0):
- Codex warns "Model metadata for `uncensoredllm-1` not found" and uses fallback metadata: 272,000 context at 95% usable (258,400), which still fits our 262,144. In the profile `model_context_window` sets it exactly.
- The fallback has no `apply_patch` tool, so Codex edits files through its shell. That works. A `model_catalog_json` entry could turn apply_patch on, but its schema is large and moves between versions, so it is not shipped.
- On Windows, `-s workspace-write` silently fell back to read-only until `-c windows.sandbox="unelevated"` was passed. That is Codex's own sandbox setting.
- Codex writes trust entries back into `config.toml` (`[projects.'…'] trust_level`): one more reason not to edit that file.
