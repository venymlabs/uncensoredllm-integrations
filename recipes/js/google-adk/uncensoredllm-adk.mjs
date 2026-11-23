// UncensoredLLM model for Google's Agent Development Kit for TypeScript (@google/adk).
// ADK for TypeScript ships Gemini-format models only (Gemini, Apigee, Chrome), so this class translates
// ADK's LlmRequest (Gemini contents, function declarations) to Chat Completions and the answer back.
//
//   import { UncensoredLLM } from './uncensoredllm-adk.mjs';
//   new LlmAgent({ name, model: new UncensoredLLM(), tools: [...] })
//   // or register it once and use the id as a string:  LLMRegistry.register(UncensoredLLM); model: 'uncensoredllm-1'
//
// Built and tested against @google/adk 2.5.0. Text and function calling only (no images, no live API).
import { BaseLlm } from '@google/adk';

const DEFAULT_BASE_URL = 'https://uncensoredllm.xyz/v1';
const MIN_OUTPUT_TOKENS = 512; // the model reasons first; smaller caps can leave no answer
const MAX_OUTPUT_TOKENS = 65536;

/** Gemini Schema (type: 'OBJECT', nullable, ...) -> JSON Schema. JSON Schema input passes through. */
export function toJsonSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' && typeof v === 'string') out.type = v.toLowerCase();
    else if (k === 'nullable') continue;
    else if (k === 'properties' && v && typeof v === 'object') out.properties = Object.fromEntries(Object.entries(v).map(([p, s]) => [p, toJsonSchema(s)]));
    else if (k === 'items' || k === 'anyOf' || k === 'additionalProperties') out[k] = toJsonSchema(v);
    else if (k === 'propertyOrdering') continue;
    else out[k] = v;
  }
  if (schema.nullable === true && typeof out.type === 'string') out.type = [out.type, 'null'];
  return out;
}

const textOf = (content) =>
  typeof content === 'string' ? content : (content?.parts ?? []).filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');

/** ADK LlmRequest -> Chat Completions request body. */
export function toChatRequest(llmRequest, model) {
  const config = llmRequest.config ?? {};
  const messages = [];
  const system = textOf(config.systemInstruction);
  if (system) messages.push({ role: 'system', content: system });

  let callSeq = 0;
  for (const content of llmRequest.contents ?? []) {
    const parts = content.parts ?? [];
    if (content.role === 'model') {
      const text = parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');
      const calls = parts.filter((p) => p.functionCall).map((p) => ({
        id: p.functionCall.id ?? `call_${++callSeq}`,
        type: 'function',
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
      }));
      if (text || calls.length) messages.push({ role: 'assistant', content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      const responses = parts.filter((p) => p.functionResponse);
      for (const p of responses) {
        messages.push({ role: 'tool', tool_call_id: p.functionResponse.id ?? `call_${callSeq}`, content: JSON.stringify(p.functionResponse.response ?? {}) });
      }
      const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
      if (text) messages.push({ role: 'user', content: text });
    }
  }

  const tools = [];
  for (const t of config.tools ?? []) {
    for (const fd of t.functionDeclarations ?? []) {
      tools.push({
        type: 'function',
        function: {
          name: fd.name,
          description: fd.description ?? '',
          parameters: fd.parametersJsonSchema ?? toJsonSchema(fd.parameters) ?? { type: 'object', properties: {} },
        },
      });
    }
  }

  const body = { model, messages };
  if (tools.length) body.tools = tools;
  if (typeof config.temperature === 'number') body.temperature = config.temperature;
  if (typeof config.topP === 'number') body.top_p = config.topP;
  if (Array.isArray(config.stopSequences) && config.stopSequences.length) body.stop = config.stopSequences;
  if (typeof config.maxOutputTokens === 'number') body.max_tokens = Math.min(MAX_OUTPUT_TOKENS, Math.max(MIN_OUTPUT_TOKENS, config.maxOutputTokens));
  if (config.responseMimeType === 'application/json') {
    const schema = config.responseJsonSchema ?? (config.responseSchema ? toJsonSchema(config.responseSchema) : undefined);
    body.response_format = schema ? { type: 'json_schema', json_schema: { name: 'response', schema } } : { type: 'json_object' };
  }
  return body;
}

const FINISH = { stop: 'STOP', length: 'MAX_TOKENS', tool_calls: 'STOP', content_filter: 'SAFETY' };

/** Chat Completions response -> ADK LlmResponse. Reasoning becomes a `thought: true` part. */
export function fromChatResponse(json) {
  const choice = json.choices?.[0] ?? {};
  const msg = choice.message ?? {};
  const parts = [];
  const reasoning = msg.reasoning_content ?? msg.reasoning;
  if (reasoning) parts.push({ text: reasoning, thought: true });
  if (msg.content) parts.push({ text: msg.content });
  for (const c of msg.tool_calls ?? []) {
    let args = {};
    try { args = JSON.parse(c.function?.arguments || '{}'); } catch { args = { _raw: c.function?.arguments }; }
    parts.push({ functionCall: { id: c.id, name: c.function?.name, args } });
  }
  const u = json.usage;
  return {
    content: { role: 'model', parts },
    finishReason: FINISH[choice.finish_reason] ?? 'OTHER',
    turnComplete: true,
    ...(u ? {
      usageMetadata: {
        promptTokenCount: u.prompt_tokens,
        candidatesTokenCount: u.completion_tokens,
        totalTokenCount: u.total_tokens,
        thoughtsTokenCount: u.completion_tokens_details?.reasoning_tokens,
        cachedContentTokenCount: u.prompt_tokens_details?.cached_tokens,
      },
    } : {}),
    modelVersion: json.model,
  };
}

export class UncensoredLLM extends BaseLlm {
  static supportedModels = [/^uncensoredllm(-.+)?$/];

  /**
   * @param {{ model?: string, apiKey?: string, baseURL?: string, reasoningMode?: 'fast'|'extended', fetch?: typeof fetch }} [opts]
   */
  constructor(opts = {}) {
    super({ model: opts.model ?? 'uncensoredllm-1' });
    this.apiKey = opts.apiKey;
    this.baseURL = (opts.baseURL ?? process.env.UNCENSOREDLLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.reasoningMode = opts.reasoningMode;
    this.fetchImpl = opts.fetch;
  }

  // Answers arrive whole (one LlmResponse per call); ADK's `stream` flag is accepted but not split into partials.
  async *generateContentAsync(llmRequest, _stream = false, abortSignal) {
    const key = this.apiKey ?? process.env.UNCENSOREDLLM_API_KEY;
    if (!key) throw new Error('UncensoredLLM: set UNCENSOREDLLM_API_KEY or pass apiKey.');
    const body = toChatRequest(llmRequest, this.model);
    if (this.reasoningMode) body.reasoning_mode = this.reasoningMode;
    const res = await (this.fetchImpl ?? globalThis.fetch)(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortSignal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      yield { errorCode: String(res.status), errorMessage: json?.error?.message ?? res.statusText, turnComplete: true };
      return;
    }
    yield fromChatResponse(json);
  }

  async connect() {
    throw new Error('UncensoredLLM does not offer the live (bidirectional audio) API.');
  }
}
