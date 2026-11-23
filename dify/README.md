## UncensoredLLM

**Author:** uncensoredllm
**Type:** model provider
**Version:** 0.1.0

### Description

[UncensoredLLM](https://uncensoredllm.xyz) is one uncensored LLM, served from our own GPUs, through an OpenAI-compatible API. This plugin adds its model, **UncensoredLLM 1** (`uncensoredllm-1`), to Dify:

- 262,144-token context, up to 65,536 output tokens
- Tool calls, streaming tool calls and JSON mode
- The model reasons before it answers; Dify shows the reasoning as the model's thinking. The **Reasoning** parameter set to `fast` keeps it short.

### Installing

This plugin is not in Dify's marketplace yet. A self-hosted Dify can install the `.difypkg` from this repository's [releases page](https://github.com/venymlabs/uncensoredllm-integrations/releases) as a local package; Dify's documentation describes that, including the signature setting for packages that do not come from the marketplace.

### Setup

1. Create an API key at https://uncensoredllm.xyz (keys start with `vk-`).
2. In Dify, open **Settings > Model Provider**, find **UncensoredLLM** and click **Setup**.
3. Paste the key. Leave **API Base URL** at `https://uncensoredllm.xyz/v1`.
4. Save. Dify checks the key with `GET /v1/balance` and `GET /v1/models`, which cost nothing.

Pick **UncensoredLLM 1** in any LLM node, agent or chat app.

### Notes

- Keep **Max Tokens** at 512 or more. The model thinks before it answers, and a smaller budget can be used up by the thinking alone.
- Embeddings, rerank, speech and images are not served.
- Pricing: $0.30 per million input tokens, $1.20 per million output tokens (see https://uncensoredllm.xyz/pricing).

### Development

```bash
uv sync
RUN_UNCENSOREDLLM_LIVE=1 UNCENSOREDLLM_API_KEY=vk-... uv run pytest -q
dify plugin package ./uncensoredllm
```
