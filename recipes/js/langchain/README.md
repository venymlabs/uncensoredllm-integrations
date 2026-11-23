# LangChain.js and LangGraph.js

Tested 2026-11-23 against the live API: `langchain` 1.6.7, `@langchain/core` 1.5.0, `@langchain/openai` 1.8.5, `@langchain/langgraph` 1.7.5, Node 24.19.0.

| Script | What | Result |
|---|---|---|
| `langgraph.mjs` | LangGraph `StateGraph`: model node, `ToolNode`, back to model; `ChatOpenAI` streaming with usage | passed |
| `agent.mjs` | LangChain v1 `createAgent` with one tool | passed (since the API fix of 2026-11-23; before it, only with a workaround) |

Model setup (from the `@langchain/openai` 1.8.5 types: `configuration` is the OpenAI client options; the docs site was not read):

```js
new ChatOpenAI({ model: 'uncensoredllm-1', apiKey: process.env.UNCENSOREDLLM_API_KEY, configuration: { baseURL: 'https://uncensoredllm.xyz/v1' } })
```

## The `name` field (fixed 2026-11-23)

`createAgent` sets `name` on every AI message it stores (the node name, default `"model"`; `langchain/dist/agents/nodes/AgentNode.js`), and `@langchain/openai` sends that as `"name": "model"` on the assistant message that carries `tool_calls`. Until 2026-11-23 the API answered that with:

```
400 tool-call author name `model` is incompatible with `tool_name` mode for tool `get_weather`
```

so every LangChain v1 agent failed on its second turn. The API now ignores `name` on an assistant message that carries tool calls, as OpenAI does. `agent.mjs` runs as written, with no workaround; it was run again against the live API after the fix.

`reasoning_content` is kept on the message in `additional_kwargs.reasoning_content`; usage arrives with `output_token_details.reasoning`.
