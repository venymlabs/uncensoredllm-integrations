# LlamaIndex.TS

Tested 2026-11-23 against the live API: `llamaindex` 0.12.1, `@llamaindex/openai` 0.4.22, `@llamaindex/workflow` 1.1.24, Node 24.19.0. Passed: tool called, answer correct.

Setup: `new OpenAI({ model: 'uncensoredllm-1', apiKey, baseURL: 'https://uncensoredllm.xyz/v1' })` from `@llamaindex/openai`, `agent({ llm, tools })` from `@llamaindex/workflow`.

Finding: `@llamaindex/openai` reports `contextWindow: 1024` for any model id outside its own table (`get metadata()` in `dist/index.js`) and has no option to change it. `@llamaindex/core/memory` sizes its token limits from that number, so long conversations get trimmed to about 1K tokens. `agent.mjs` subclasses `OpenAI` and overrides `metadata.contextWindow` with 262144. Tool calling itself is on (`supportToolCall` is true for any id that is not an old `0314`/`0301` or `o1` model).

Note: the LlamaIndexTS repository's last push was 2026-03-11 (GitHub API), and weekly downloads are the lowest of the frameworks covered here.
