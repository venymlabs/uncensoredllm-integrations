# UncensoredLLM for VS Code

Adds **UncensoredLLM 1** to VS Code's chat model picker. UncensoredLLM is one uncensored LLM, served from our own GPUs: no refusals, no prompt logs, no email. Pay per token.

## Set up

1. Get an API key at [uncensoredllm.xyz/dashboard/keys](https://uncensoredllm.xyz/dashboard/keys?src=vscode). Keys start with `vk-`.
2. Run **UncensoredLLM: Set API Key** from the Command Palette and paste it. The key is kept in VS Code's secret storage, never in `settings.json`.
3. Open the chat view and pick **UncensoredLLM 1** in the model picker. If it is not listed, choose **Manage Models…** in the picker and make it visible.

Run **UncensoredLLM: Check Connection** at any time to confirm the key works and see your balance.

## Use it from other extensions

The model is registered through VS Code's Language Model API, so any extension that reads models from `vscode.lm` can use it. In Cline, for example, choose the **VS Code LM API** provider and pick `uncensoredllm / uncensoredllm-1`. VS Code asks you once to allow that extension to use the model.

## Commands

| Command | What it does |
|---|---|
| UncensoredLLM: Set API Key | Saves a key to secret storage |
| UncensoredLLM: Remove API Key | Deletes it |
| UncensoredLLM: Check Connection | Lists the models your key can use and shows your balance (no tokens spent) |
| UncensoredLLM: Get an API Key | Opens the keys page |
| UncensoredLLM: Manage | All of the above in one menu (also the gear next to UncensoredLLM in the model manager) |

## Settings

| Setting | Default | |
|---|---|---|
| `uncensoredllm.reasoningMode` | `default` | `fast` shortens the model's thinking for a quicker first token |
| `uncensoredllm.baseUrl` | `https://uncensoredllm.xyz/v1` | User settings only, so a workspace cannot change where your key is sent |

## The model

| | |
|---|---|
| Model id | `uncensoredllm-1` |
| Context | 262,144 tokens (up to 65,536 of them for the answer) |
| Tool calling | yes (agent mode works) |
| Images | no |

The model thinks before it answers, so the first words can take a few seconds.

## Requirements

VS Code 1.104 or newer. VS Code's chat view shows models from extensions; on GitHub Copilot Business or Enterprise, an administrator can turn this off with the "Bring Your Own Language Model Key" policy.

## Privacy

The extension sends your prompts only to the API address above, and only when you use the model. It has no telemetry. Its log (Output → UncensoredLLM) records request status and timing, never prompts, answers or your key.

UncensoredLLM is an independent service. This extension is not affiliated with Microsoft or GitHub.
