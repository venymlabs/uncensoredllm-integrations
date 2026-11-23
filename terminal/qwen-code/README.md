# Qwen Code

Route: connect adapter `qwen-code`. It adds one entry to `modelProviders.openai` in `~/.qwen/settings.json` (`id`, `name`, `envKey: "UNCENSOREDLLM_API_KEY"`, `baseUrl`, `generationConfig.contextWindowSize: 262144`). On a machine with no model chosen yet it also sets `security.auth.selectedType = "openai"` and `model.name`; otherwise the user's choice stays and the launch line is `qwen --auth-type openai -m uncensoredllm-1`.

Qwen Code reads models.dev too, but only for context and output limits of an allow-list of first-party labs (docs/design/2026-08-23-models-dev-registry.md), so the models.dev listing does not make us selectable there.

Tested with @qwen-code/qwen-code 0.28.4: wrote a file in auto-edit mode against the live API.
