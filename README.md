# UncensoredLLM integrations

Plugins, packages, import files and tested recipes for using [UncensoredLLM](https://uncensoredllm.xyz) from the tools people already work in. UncensoredLLM is one uncensored LLM behind an OpenAI-compatible API.

| | |
|---|---|
| Base URL | `https://uncensoredllm.xyz/v1` |
| Key | starts with `vk-`, sent as `Authorization: Bearer`; make one at https://uncensoredllm.xyz (no email needed) |
| Model | `uncensoredllm-1` |
| Context / max output | 262,144 tokens / 65,536 tokens |
| Speaks | Chat Completions (streaming, tool calls, JSON mode), the Responses API, and Anthropic's Messages API at `https://uncensoredllm.xyz/v1/messages` |
| Does not serve | embeddings, images, audio |

The model reasons before it answers. Leave `max_tokens` unset or at 512 or more: a very small limit can be used up by the reasoning alone, and the reply then comes back empty with `finish_reason: "length"`.

## The quick way: one command

For coding agents, editors and personal agents that are set up through a config file, use the installer. It finds the tools on your machine, shows every change before making it, and can undo:

```
npx github:venymlabs/uncensoredllm-connect
```

It covers Claude Code, Codex CLI, OpenCode, Aider, Goose, Crush, pi, Qwen Code, OpenClaw, Hermes Agent, nanobot, OpenHands, Cline, Kilo Code, Continue, Zed, VS Code chat, LibreChat, Raycast AI and Factory Droid. Source: [venymlabs/uncensoredllm-connect](https://github.com/venymlabs/uncensoredllm-connect).

## What is in this repository

How each item was checked is stated, because it differs. "Run" means the real tool completed a task that used a tool call against the live API. Nothing here has been published to npm, PyPI or a marketplace yet; built packages are on the [releases page](https://github.com/venymlabs/uncensoredllm-integrations/releases).

### Editors

| Folder | What | Checked |
|---|---|---|
| `vscode-extension/` | A VS Code extension that adds the model to the chat model picker. The key is kept in VS Code's secret storage. | Run inside VS Code 1.147 and 1.104 and VSCodium 1.143, with a live call |
| `editors/` | Notes and example configs for Cline, Kilo Code, Continue, Zed, VS Code chat with your own key, Roo Code / Zoo Code, and what is and is not possible in Cursor, JetBrains AI Assistant and Windsurf | Against each tool's source code or config schema; not run in the editor |

### Agent frameworks

| Folder | What | Checked |
|---|---|---|
| `ai-sdk-provider/` | A provider for the Vercel AI SDK (versions 7 and 6): streaming, tool calls, the model's reasoning | Unit tests and live calls |
| `recipes/js/` | The smallest working tool-calling agent for Mastra, LangChain.js, LangGraph.js, the OpenAI Agents SDK, LlamaIndex.TS, TanStack AI, Genkit, VoltAgent, Strands and Google ADK | Each run against the live API; each folder says what needed a workaround |
| `recipes/python/` | The same for LangChain and LangGraph, the OpenAI Agents SDK, Strands, Google ADK, Pydantic AI, Instructor, DSPy, LlamaIndex, CrewAI, Agno, smolagents, Microsoft Agent Framework, AutoGen, AG2 and Haystack | Each run against the live API; `versions.txt` in each folder has the exact versions |

### Automation platforms

| Folder | What | Checked |
|---|---|---|
| `n8n/` | A community node package: a chat model for AI Agents, a prompt node and a balance check | Run inside n8n 2.48.7 |
| `dify/` | A model provider plugin | Packaged with Dify's own tool; its tests pass with live calls; not run inside Dify |
| `open-webui/` | A pipe function, with one shared key or a key per user | Tested by calling it the way Open WebUI does; not run inside Open WebUI |
| `langflow/` | A model component | Loaded through Langflow's component loader; live calls pass; the Langflow server was not run |
| `activepieces/` | A piece with two actions | Its tests pass with live calls; not run inside Activepieces |
| `zapier/` | A Zapier Platform integration | Zapier's validation and live tests pass; not pushed to Zapier |
| `make/` | An importable blueprint and written steps | The request was sent to the live API; not imported into Make |
| `flowise/` | Written steps | From Flowise's source; not run |

### Agents and chat apps

| Folder | What | Checked |
|---|---|---|
| `hermes-agent/` | A provider plugin for Hermes Agent | Run with Hermes Agent 0.21.1 |
| `goose/` | A custom-provider file for Goose | Run with Goose 1.60.2 |
| `openclaw/` | A config patch for OpenClaw | Accepted by OpenClaw's own validator and run with OpenClaw 2026.11.7 |
| `chatbox/` | An import file and a link that carry no key | Their own tests; not run in the app |
| `cherry-studio/` | A script that builds an import link for your key | Its own tests; not run in the app |
| `terminal/` | Notes for Aider, Codex CLI, pi and Qwen Code | Each tool was run; the installer above does the setup |

## Installing the packages before they are on a registry

- **AI SDK provider:** `npm install https://github.com/venymlabs/uncensoredllm-integrations/releases/download/v0.1.0/uncensoredllm-ai-sdk-provider-0.1.0.tgz ai zod`. The recipes that import `@uncensoredllm/ai-sdk-provider` need this.
- **VS Code extension:** download the `.vsix` from the releases page, then run "Extensions: Install from VSIX" in VS Code.
- **n8n node and Dify plugin:** the packed files are on the releases page; each folder's README says how that platform installs a package that is not from its own directory. The Activepieces piece is source only: build it as its README describes.

## API changes since these were written

2026-11-23: three faults that some of these integrations work around were fixed in the API.

- An assistant message that carries tool calls may have a `name` field. LangChain.js `createAgent` sends one, and it used to get a 400.
- A small `max_tokens` that the reasoning uses up returns a normal empty reply with `finish_reason: "length"`. It used to return `502 empty_completion`. Code here that raises small values to 512 still does, so that you get an answer; comments that mention the 502 describe the old behaviour.
- Responses no longer carry a top-level `metadata` object, which strict clients warned about.

The same day the API began to answer in Anthropic's Messages format, so Claude Code and the Anthropic SDKs can use it: base URL `https://uncensoredllm.xyz` (no `/v1`), your `vk-` key, model `uncensoredllm-1`.

## Not affiliated

These are independent integrations for UncensoredLLM customers. None of them is made or endorsed by the tools they connect to. If one is wrong for your version of a tool, an issue here is welcome.

MIT licence.
