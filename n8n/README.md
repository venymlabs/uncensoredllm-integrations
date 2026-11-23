# n8n-nodes-uncensoredllm

n8n community nodes for [UncensoredLLM](https://uncensoredllm.xyz): one uncensored LLM, served from our own GPUs, through an OpenAI-compatible API.

| Node | What it does |
|---|---|
| **UncensoredLLM Chat Model** | A chat model sub-node. Connect it to an **AI Agent**, **Basic LLM Chain** or any node with a *Chat Model* input. Tool calls work. |
| **UncensoredLLM** | A regular node. **Message a Model** sends a prompt and returns the reply; **Get Balance** reads the credit left. It can also be used as a tool by an AI Agent. |

[Installation](#installation) · [Credentials](#credentials) · [Usage](#usage) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

> **Not on npm yet.** Until it is, the packed node is on this repository's [releases page](https://github.com/venymlabs/uncensoredllm-integrations/releases): install that file with `npm install` in your self-hosted n8n's nodes folder, as n8n's guide for installing a community node by hand describes, and restart n8n. The steps below apply once the package is on npm.

Follow n8n's [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/): **Settings > Community Nodes > Install**, then enter `n8n-nodes-uncensoredllm`.

## Credentials

1. Create an API key at https://uncensoredllm.xyz. Keys start with `vk-`.
2. In n8n, create an **UncensoredLLM API** credential and paste the key. Leave **Base URL** at `https://uncensoredllm.xyz/v1`.
3. n8n tests the credential with `GET /v1/balance`, which costs nothing.

n8n stores the key encrypted in its own credential store. These nodes send it only to the base URL in the credential, as an `Authorization: Bearer` header, and nowhere else. They collect no telemetry.

## Usage

**AI Agent.** Add an **AI Agent** node, click the *Chat Model* connector and choose **UncensoredLLM Chat Model**. Attach tools as usual.

**One prompt.** Add the **UncensoredLLM** node, choose **Message a Model**, and write the prompt. With **Simplify Output** on (the default) the node returns `text`, `finish_reason` and `usage`.

Options on both nodes:

- **Maximum Number of Tokens**: upper limit on the reply, reasoning included. The model reasons before it answers, so the nodes never send less than 512.
- **Reasoning**: `Extended` (default) or `Fast`, which keeps the reasoning short.
- **Response Format / JSON Output**: ask for a JSON object.

An example workflow is in [`examples/agent-workflow.json`](examples/agent-workflow.json): import it with **Workflows > Import from File**.

## Compatibility

Built with `@n8n/node-cli` 0.57.4 and tested on n8n 2.48.7. The chat model node uses `@n8n/ai-node-sdk`, which n8n ships with 2.x.

## Resources

- [UncensoredLLM API docs](https://uncensoredllm.xyz/docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Source repository: https://github.com/venymlabs/uncensoredllm-integrations/tree/main/n8n
