# JetBrains AI Assistant

## Route: documentation only

AI Assistant 2026.3 connects to third-party OpenAI-compatible endpoints in Settings | Tools | AI Assistant | Providers & API keys. The key goes into the IDE's password safe (system keychain) and the rest into IDE option files whose format is not documented and which the running IDE rewrites, so no adapter writes them.

Steps for a user (from https://www.jetbrains.com/help/ai-assistant/use-custom-models.html, read 2026-11-23):

1. Settings | Tools | AI Assistant | Providers & API keys. Under Third-party AI providers choose OpenAI-compatible.
2. URL: `https://uncensoredllm.xyz/v1`. API Key: your `vk-` key. Turn on Tool calling.
3. Test Connection, then Apply.
4. In Models Assignment, assign `uncensoredllm-1` to Core features and set the context window to 262144. Until a model is assigned, it is available only in AI Chat.
5. Do not use it for AI Completion: JetBrains' page says completion needs a model built for code completion.

JetBrains' page notes some features may be unavailable with third-party models without a JetBrains AI subscription. The same IDEs also run Cline, Kilo Code and Continue as plugins; those read the same files as their VS Code versions, so their adapters cover JetBrains too.

Not tested: no JetBrains IDE here.
