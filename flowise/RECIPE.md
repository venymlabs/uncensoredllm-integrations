# UncensoredLLM in Flowise

Flowise has no plugin format an outsider can ship: a new node means a change to Flowise's own source (`packages/components/nodes/`) and a rebuild. Its built-in **OpenAI Custom Model** node already speaks to any OpenAI-compatible server, so that is the route.

Source, read 2026-11-23: `packages/components/nodes/chatmodels/ChatOpenAICustom/ChatOpenAICustom.ts` on Flowise `main` (node `chatOpenAICustom`, version 4.0; the **Base Path** input becomes the client's `baseURL`; the key comes from an **OpenAI API** credential, field `openAIApiKey`). **Not run**: Flowise was not installed here.

## Steps

1. **Credentials > Add Credential > OpenAI API.** Name it `UncensoredLLM` and paste your `vk-` key as the OpenAI API key. Flowise stores it encrypted.
2. In a chatflow, add **Chat Models > OpenAI Custom Model** (not the plain *ChatOpenAI* node).
3. Set:

| Input | Value |
|---|---|
| Connect Credential | `UncensoredLLM` |
| Model Name | `uncensoredllm-1` |
| Base Path (Additional Parameters) | `https://uncensoredllm.xyz/v1` |
| Max Tokens (Additional Parameters) | leave empty, or 512 or more |
| Streaming | on (default) |

4. Connect it to a chain or a **Tool Agent** as usual. Tool calls work.

Notes:

- The model reasons before it answers. A **Max Tokens** below about 400 can be spent on the reasoning alone and returns `502 empty_completion`.
- Embeddings are not served: point document stores at another embeddings provider.
- In Agentflow V2, the **LLM** and **Agent** nodes list chat model nodes; pick **OpenAI Custom Model** there and fill in the same values.
