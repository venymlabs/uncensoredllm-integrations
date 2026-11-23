# VS Code chat (GitHub Copilot) with your own key

GitHub Copilot Chat now ships inside VS Code (`extensions/copilot` in microsoft/vscode; the separate microsoft/vscode-copilot-chat repository is archived). Its bring-your-own-key providers include **Custom Endpoint** (`vendor: "customendpoint"`), which takes any Chat Completions, Responses or Messages URL. The older "OpenAI Compatible" (`customoai`) is deprecated and shown only in Insiders.

## Route: adapter

The `vscode-copilot-chat` adapter in [uncensoredllm-connect](https://github.com/venymlabs/uncensoredllm-connect) adds one provider group to `chatLanguageModels.json` in VS Code's user data folder (`IUserDataProfile.languageModelsResource`):

- Windows `%APPDATA%\Code\User`, macOS `~/Library/Application Support/Code/User`, Linux `$XDG_CONFIG_HOME/Code/User` (else `~/.config`). `Code - Insiders` too when it exists. Default profile only.
- The group: `{ vendor: "customendpoint", name: "UncensoredLLM", apiType: "chat-completions", models: [{ id, name, url, apiType, toolCalling, vision, contextWindow, maxOutputTokens, thinking, streaming }] }`. Output for an empty machine: `example/chatLanguageModels.json`.
- **The key is never written.** `apiKey` is a `secret` property: VS Code stores it in its secret storage and puts only `${input:chat.lm.secret.<hash>}` in the file (`_resolveLanguageModelProviderGroup` in `src/vs/workbench/contrib/chat/common/languageModels.ts`). A plain key in the file is not read. The user sets it once with Chat: Manage Language Models > the group > Update API Key. On a second run the adapter keeps whatever `apiKey` reference VS Code put in the group.
- Bring-your-own-key is allowed signed out and on individual Copilot plans; Business and Enterprise seats need the organisation policy (`isClientBYOKAllowed`, `extensions/copilot/src/extension/byok/common/byokProvider.ts`).

## Verified against

- Source: microsoft/vscode@a902b1c8a50d432e738bec7e31a233e82ce63db6: `extensions/copilot/package.json` (`languageModelChatProviders`), `src/vs/workbench/contrib/chat/browser/languageModelsConfigurationService.ts`, `src/vs/workbench/contrib/chat/common/languageModels.ts`, `extensions/copilot/src/extension/byok/vscode-node/customEndpointProvider.ts` (`https://uncensoredllm.xyz/v1` resolves to `/v1/chat/completions`).
- Schema: the group validates against the `customendpoint` configuration schema from that `package.json` with ajv, and the validator rejects a model missing `toolCalling`.
- Adapter tests: `adapters/vscode-copilot-chat.test.mjs` in that repository.
- Not run: no VS Code here.

