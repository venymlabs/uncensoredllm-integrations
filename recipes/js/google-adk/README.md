# Google Agent Development Kit for TypeScript (@google/adk)

ADK for TypeScript 2.5.0 ships only Gemini-format models (`Gemini`, `ApigeeLlm`, `ChromePromptLlm` in `dist/esm/models/`); unlike ADK for Python it has no LiteLLM or OpenAI-compatible model. So the route here is a model class:

- `uncensoredllm-adk.mjs`: `UncensoredLLM extends BaseLlm`. Converts ADK's `LlmRequest` (system instruction, Gemini `contents`, function declarations with Gemini schemas) to a Chat Completions request, and the response back (text, `functionCall` parts with ids, reasoning as a `thought: true` part, usage, finish reason). Applies the 512-token output floor. Text and tools only: no images, no live API, answers arrive whole (no partial events).
- Use it as `model: new UncensoredLLM()` or register it: `LLMRegistry.register(UncensoredLLM)` then `model: 'uncensoredllm-1'`.

Tested 2026-11-23: `@google/adk` 2.5.0, Node 24.19.0.
- `agent.mjs` against the live API with `InMemoryRunner`: passed (tool called, answer correct).
- `uncensoredllm-adk.test.mjs`, 4 offline tests: passed.

If ADK adoption grows, this file is the seed of a small `@uncensoredllm/adk` package; for now it is a copy-in recipe.
