# Roo Code and Zoo Code

Roo Code was shut down: its team announced it in April 2026 and archived RooCodeInc/Roo-Code on 2026-05-15 (repository marked archived on GitHub; the README points to Cline and to Zoo Code). The Marketplace extension still shows 2.1M installs. Zoo Code (Zoo-Code-Org/Zoo-Code, `ZooCodeOrganization.zoo-code`, 124K installs, updated 2026-11-23) is the community continuation and keeps Roo's settings import format.

## Route: importable profile

`uncensoredllm-settings.json` is a Roo/Zoo settings export holding one provider profile, "UncensoredLLM", on the OpenAI Compatible provider (`apiProvider: "openai"`, `openAiBaseUrl`, `openAiModelId`, `openAiCustomModelInfo { contextWindow: 262144, maxTokens: 16384 }`). The key field is empty on purpose.

Steps for a user:

1. In Roo Code or Zoo Code open Settings > About (the settings panel footer) > Import, and choose `uncensoredllm-settings.json`.
2. Import adds the profile next to the existing ones (`apiConfigs: { ...previous, ...imported }` in `src/core/config/importExport.ts`) and makes it the current profile.
3. Open the "UncensoredLLM" profile and paste your `vk-` key into API Key.

No adapter: Roo and Zoo keep profiles in VS Code's secret storage and global state, which no file adapter may write. The one file-level hook is the VS Code setting `roo-cline.autoImportSettingsPath` / `zoo-code.autoImportSettingsPath`, which imports a file at the next start (`src/utils/autoImportSettings.ts`); it is not used here because it would re-import on every start.

## Verified against

- Roo-Code@b867ec9145750d0ae1ff7f02d35406e9bf2a0b16: `src/core/config/importExport.ts` (lenient import, merge), `src/core/config/ProviderSettingsManager.ts` (`providerProfilesSchema`), `packages/types/src/provider-settings.ts` (`openAiSchema`), `packages/types/src/model.ts` (`modelInfoSchema`: `contextWindow` and `supportsPromptCache` required).
- Zoo-Code@5a05ff1af1465e505766a0e4ebc0e5062a20b5f4: same import entry point; `packages/types/src/providers/openai.ts` has the same fields (`openAiModelId`, `openAiCustomModelInfo`).
- Read only; the import was not run.
