# Goose

Goose's own contributing guide (CONTRIBUTING.md, "LLM Provider Integrations", read 2026-11-23) says the best route for an
OpenAI-compatible service is to **publish a custom-provider JSON file with our own documentation**; built-in providers are
accepted "only occasionally ... by exception", and an external PR must link an issue that has reached Ready.

So the primary route is the file itself:

- `declarative/uncensoredllm.json`: the custom-provider file. A user puts it in `~/.config/goose/custom_providers/`
  (Windows: `%APPDATA%\Block\goose\config\custom_providers\`), sets `UNCENSOREDLLM_API_KEY`, and runs
  `goose session --provider uncensoredllm --model uncensoredllm-1`. The connect adapter `goose` writes exactly this file.
- Tested 2026-11-23: goose 1.60.2 (release zip) in a sandboxed `APPDATA`, `GOOSE_DISABLE_KEYRING=1`, ran
  `goose run --provider uncensoredllm --model uncensoredllm-1` on a file-writing task: it used its shell tool, wrote
  `hello-goose.txt` and read it back.
