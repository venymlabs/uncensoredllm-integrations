# pi (pi coding agent)

Route: connect adapter `pi`, which adds `providers.uncensoredllm` to `~/.pi/agent/models.json` (or `$PI_CODING_AGENT_DIR/models.json`): `api: "openai-completions"`, `apiKey: "$UNCENSOREDLLM_API_KEY"`, `compat` with no `store`, no developer role and no `reasoning_effort` (our reasoning is always on), and the model with `reasoning: true`, `contextWindow: 262144`, `maxTokens: 65536`. Launch: `pi --model uncensoredllm/uncensoredllm-1`.

Tested with pi 1.6.0 (`@earendil-works/pi-coding-agent`, the renamed `@mariozechner/pi-coding-agent`): `--list-models` shows it with thinking on, and a tool-using prompt completed.

Native listing, later: pi's built-in catalog (`packages/ai/catalog/`) is generated mostly from models.dev with one small file per provider (`modelsDevModels(ctx, "uncensoredllm", { api: "openai-completions", baseUrl })`). It is curated, and CONTRIBUTING.md auto-closes issues and PRs from new contributors and asks for issues in the author's own words. So a listing on models.dev is the route in.
