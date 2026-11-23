# LangChain.js and LangGraph.js

Tested 2026-11-23 against the live API: `langchain` 1.6.7, `@langchain/core` 1.5.0, `@langchain/openai` 1.8.5, `@langchain/langgraph` 1.7.5, Node 24.19.0.

| Script | What | Result |
|---|---|---|
| `langgraph.mjs` | LangGraph `StateGraph`: model node, `ToolNode`, back to model; `ChatOpenAI` streaming with usage | passed |
| `agent.mjs` | LangChain v1 `createAgent` with one tool | **failed as written** (400), passed with the workaround in the file |

Model setup (from the `@langchain/openai` 1.8.5 types: `configuration` is the OpenAI client options; the docs site was not read):

```js
new ChatOpenAI({ model: 'uncensoredllm-1', apiKey: process.env.UNCENSOREDLLM_API_KEY, configuration: { baseURL: 'https://uncensoredllm.xyz/v1' } })
```

## The incompatibility

`createAgent` sets `name` on every AI message it stores (the node name, default `"model"`; `langchain/dist/agents/nodes/AgentNode.js`). `@langchain/openai` sends that as `"name": "model"` on the assistant message that carries `tool_calls`. The API answers:

```
400 tool-call author name `model` is incompatible with `tool_name` mode for tool `get_weather`
```

The API accepts `name` on a plain assistant message, on a tool message, and on a tool-call message only when `name` equals the tool's name. So every LangChain v1 agent fails on its second turn. Plain LangGraph graphs (no `name`) work.

- **Workaround in user code** (in `agent.mjs`): a `fetch` passed through `configuration.fetch` that deletes `name` from assistant messages.
- **On our side:** this is a fault in the API, which should ignore that field the way OpenAI does. Until it is fixed there, use the workaround.

`reasoning_content` is kept on the message in `additional_kwargs.reasoning_content`; usage arrives with `output_token_details.reasoning`.
