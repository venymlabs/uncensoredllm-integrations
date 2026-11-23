# Aider

Route: connect adapter `aider`; a LiteLLM registry entry (model id `uncensoredllm/uncensoredllm-1`) is prepared separately.

The adapter leaves `OPENAI_API_BASE` and `OPENAI_API_KEY` alone. It adds:
- an `openai/uncensoredllm-1` entry to `~/.aider.model.settings.yml` with `extra_params.api_base` (so only this model goes to us), `edit_format: diff`, `weak_model_name` set to itself, `use_repo_map: true`;
- the same name to `~/.aider.model.metadata.json` with 262,144 / 65,536 tokens (no unknown-model warning).

Launch: `aider --model openai/uncensoredllm-1 --openai-api-key "$UNCENSOREDLLM_API_KEY"` (PowerShell: `$env:UNCENSOREDLLM_API_KEY`).

Tested with aider 0.86.2: it showed the model's thinking, then fixed `a - b` to `a + b` in a file with a SEARCH/REPLACE edit. On Windows run it with `PYTHONUTF8=1`, or Aider's console crashes on the "►" marker before printing.

Aider's last commit is from 2026-05-22: still widely installed (81k downloads a week), but slowing.
