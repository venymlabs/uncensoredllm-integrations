// The editor-independent half of the extension: request building, the HTTP call, SSE parsing and the
// mapping of a streamed chat completion onto VS Code's response parts. Everything VS Code-specific
// (the part classes, the cancellation token) is passed in, so this file runs under plain Node for tests.
"use strict";

const MODEL = {
  id: "uncensoredllm-1",
  name: "UncensoredLLM 1",
  family: "uncensoredllm",
  version: "1",
  // 262,144-token context shared by prompt and answer; the answer may use up to 65,536 of it.
  maxInputTokens: 196608,
  maxOutputTokens: 65536,
  tooltip: "One uncensored LLM, served from our own GPUs (uncensoredllm.xyz)",
  detail: "uncensoredllm.xyz",
  capabilities: { imageInput: false, toolCalling: true },
};

const DEFAULT_BASE_URL = "https://uncensoredllm.xyz/v1";
const KEYS_URL = "https://uncensoredllm.xyz/dashboard/keys?src=vscode";
const USER_AGENT = "uncensoredllm-vscode";

// LanguageModelChatMessageRole: User = 1, Assistant = 2, System = 3 (System is a proposed API, but the
// editor's own chat sends it to providers, so it is handled by number).
const ROLE = { 1: "user", 2: "assistant", 3: "system" };

/** Validates a base URL: https anywhere, http only on the local machine. Returns the URL without a trailing slash, or null. */
function normalizeBaseUrl(raw) {
  const s = String(raw || "").trim().replace(/\/+$/, "");
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol === "https:") return s;
  if (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) return s;
  return null;
}

function looksLikeKey(s) {
  return typeof s === "string" && /^vk-[A-Za-z0-9_-]{8,}$/.test(s.trim());
}

// ---- parts, by shape (works for the real classes and for test fakes) ----
const isToolCall = (p) => p && typeof p === "object" && typeof p.callId === "string" && typeof p.name === "string" && "input" in p;
const isToolResult = (p) => p && typeof p === "object" && typeof p.callId === "string" && Array.isArray(p.content);
const isText = (p) => p && typeof p === "object" && typeof p.value === "string" && !("callId" in p);
const isData = (p) => p && typeof p === "object" && typeof p.mimeType === "string" && p.data instanceof Uint8Array;

function dataToText(p) {
  const mt = p.mimeType.toLowerCase();
  if (mt.startsWith("text/") || mt === "application/json" || mt.endsWith("+json")) return Buffer.from(p.data).toString("utf8");
  return null; // images and opaque data (for example cache_control markers) are not sent
}

function toolResultText(part) {
  const out = [];
  for (const c of part.content) {
    if (isText(c)) out.push(c.value);
    else if (isData(c)) {
      const t = dataToText(c);
      if (t != null) out.push(t);
    } else if (c && typeof c === "object" && "value" in c) out.push(typeof c.value === "string" ? c.value : JSON.stringify(c.value));
    else if (typeof c === "string") out.push(c);
  }
  return out.join("\n");
}

/** VS Code request messages -> OpenAI chat messages. */
function toOpenAIMessages(messages) {
  const out = [];
  for (const m of messages) {
    const role = ROLE[m.role] || "user";
    const parts = Array.isArray(m.content) ? m.content : [];
    if (role === "assistant") {
      let text = "";
      const calls = [];
      for (const p of parts) {
        if (isToolCall(p)) calls.push({ id: p.callId, type: "function", function: { name: p.name, arguments: JSON.stringify(p.input ?? {}) } });
        else if (isText(p)) text += p.value;
        else if (isData(p)) text += dataToText(p) ?? "";
      }
      if (!text && !calls.length) continue;
      const msg = { role: "assistant", content: text || null };
      if (calls.length) msg.tool_calls = calls;
      out.push(msg);
      continue;
    }
    // user / system: tool results become their own "tool" messages, placed before the rest of the turn
    let text = "";
    for (const p of parts) {
      if (isToolResult(p)) out.push({ role: "tool", tool_call_id: p.callId, content: toolResultText(p) });
      else if (isText(p)) text += p.value;
      else if (isData(p)) text += dataToText(p) ?? "";
    }
    if (text) out.push({ role, content: text });
  }
  return out;
}

const PASS_THROUGH = ["temperature", "top_p", "stop", "seed", "presence_penalty", "frequency_penalty"];

/** Builds the /chat/completions body. */
function buildRequest({ model, messages, options = {}, reasoningMode }) {
  const body = { model: model.id, messages: toOpenAIMessages(messages), stream: true };
  const tools = Array.isArray(options.tools) ? options.tools : [];
  if (tools.length) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description || "", parameters: t.inputSchema && typeof t.inputSchema === "object" ? t.inputSchema : { type: "object", properties: {} } },
    }));
    // LanguageModelChatToolMode: Auto = 1, Required = 2
    body.tool_choice = options.toolMode === 2 ? "required" : "auto";
  }
  const mo = options.modelOptions && typeof options.modelOptions === "object" ? options.modelOptions : {};
  for (const k of PASS_THROUGH) if (mo[k] !== undefined) body[k] = mo[k];
  const mt = mo.max_tokens ?? mo.maxTokens;
  // Under ~400 tokens the whole budget can go on thinking and the API answers 502 empty_completion.
  if (typeof mt === "number" && mt > 0) body.max_tokens = Math.min(Math.max(Math.floor(mt), 512), model.maxOutputTokens);
  if (reasoningMode === "fast") body.reasoning_mode = "fast";
  return body;
}

class ApiError extends Error {
  constructor(message, { status = 0, code = null } = {}) {
    super(message);
    this.name = "UncensoredLLMError";
    this.status = status;
    this.code = code;
  }
}

/** A plain-language error for a failed HTTP call. Never includes the key. */
function describeHttpError(status, payload, retryAfter) {
  const e = payload && payload.error ? payload.error : {};
  const code = e.code || null;
  const msg = typeof e.message === "string" ? e.message : "";
  let text;
  if (status === 401 || status === 403) text = "UncensoredLLM rejected the API key. Run \"UncensoredLLM: Set API Key\" with a key from uncensoredllm.xyz/dashboard/keys.";
  else if (status === 402) text = `UncensoredLLM: not enough credit on this account. ${msg}`.trim();
  else if (status === 429) text = `UncensoredLLM: rate limited${retryAfter ? `, try again in ${retryAfter} s` : ""}. ${msg}`.trim();
  else if (status === 502 && code === "empty_completion") text = "UncensoredLLM: the model spent its whole token budget thinking. Raise max tokens (512 or more) or leave it unset.";
  else if (status >= 500) text = `UncensoredLLM: server error ${status}. ${msg}`.trim();
  else text = `UncensoredLLM: request failed (${status}). ${msg}`.trim();
  return new ApiError(text, { status, code });
}

/** Yields the JSON payload of each SSE `data:` event. Comments and blank keepalives are skipped. */
async function* sseEvents(body) {
  const decoder = new TextDecoder();
  let buf = "";
  let data = [];
  const flush = function* () {
    if (data.length) {
      const d = data.join("\n");
      data = [];
      yield d;
    }
  };
  for await (const chunk of body) {
    buf += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.search(/\r?\n/)) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + (buf[i] === "\r" ? 2 : 1));
      if (line === "") yield* flush();
      else if (line.startsWith(":")) continue;
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
  }
  buf += decoder.decode();
  if (buf.startsWith("data:")) data.push(buf.slice(5).replace(/^ /, ""));
  yield* flush();
}

/**
 * Sends one chat request and reports parts as they stream.
 * deps: { fetch, makeText(value), makeToolCall(id, name, input), log(line) }
 * Resolves with { text, toolCalls, finishReason, usage }. Cancellation via `signal` resolves early without error.
 */
async function streamChat({ baseUrl, apiKey, body, signal, report, deps }) {
  const doFetch = deps.fetch || globalThis.fetch;
  const started = Date.now();
  let res;
  try {
    res = await doFetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", accept: "text/event-stream", "user-agent": USER_AGENT },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal && signal.aborted) return { cancelled: true, text: "", toolCalls: [] };
    throw new ApiError(`UncensoredLLM: could not reach ${new URL(baseUrl).host} (${err && err.cause && err.cause.code ? err.cause.code : err && err.message})`);
  }
  deps.log?.(`POST /chat/completions -> ${res.status} in ${Date.now() - started} ms`);
  if (!res.ok) {
    let payload = null;
    try {
      payload = JSON.parse(await res.text());
    } catch {}
    throw describeHttpError(res.status, payload, res.headers.get("retry-after"));
  }

  let text = "";
  let finishReason = null;
  let usage = null;
  const calls = new Map(); // index -> { id, name, args }
  try {
    for await (const ev of sseEvents(res.body)) {
      if (ev === "[DONE]") break;
      let j;
      try {
        j = JSON.parse(ev);
      } catch {
        continue;
      }
      if (j.error) throw new ApiError(`UncensoredLLM: ${j.error.message || "stream failed"}`, { code: j.error.code || null });
      if (j.usage) usage = j.usage;
      const choice = j.choices && j.choices[0];
      if (!choice) continue;
      const d = choice.delta || {};
      if (typeof d.content === "string" && d.content) {
        text += d.content;
        report(deps.makeText(d.content));
      }
      if (Array.isArray(d.tool_calls)) {
        for (const tc of d.tool_calls) {
          const idx = typeof tc.index === "number" ? tc.index : calls.size;
          const cur = calls.get(idx) || { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function && tc.function.name) cur.name += tc.function.name;
          if (tc.function && typeof tc.function.arguments === "string") cur.args += tc.function.arguments;
          calls.set(idx, cur);
        }
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }
  } catch (err) {
    if (signal && signal.aborted) return { cancelled: true, text, toolCalls: [] };
    throw err;
  }

  const toolCalls = [];
  for (const [idx, c] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
    let input = {};
    if (c.args.trim()) {
      try {
        input = JSON.parse(c.args);
      } catch {
        throw new ApiError(`UncensoredLLM: the model returned arguments for tool "${c.name}" that are not valid JSON.`, { code: "bad_tool_arguments" });
      }
    }
    const id = c.id || `call_${idx}_${Date.now().toString(36)}`;
    toolCalls.push({ id, name: c.name, input });
    report(deps.makeToolCall(id, c.name, input));
  }
  if (!text && !toolCalls.length && !(signal && signal.aborted)) {
    throw new ApiError("UncensoredLLM: the model returned an empty answer. Try again, or raise max tokens.", { code: "empty_completion" });
  }
  deps.log?.(`stream done: ${text.length} chars, ${toolCalls.length} tool call(s), finish=${finishReason}`);
  return { text, toolCalls, finishReason, usage, cancelled: false };
}

/** Rough token count (about 4 characters a token); the API reports exact usage. */
function estimateTokens(input) {
  if (typeof input === "string") return Math.ceil(input.length / 4);
  if (input && Array.isArray(input.content)) {
    let n = 4;
    for (const p of input.content) {
      if (isText(p)) n += Math.ceil(p.value.length / 4);
      else if (isToolCall(p)) n += Math.ceil((p.name.length + JSON.stringify(p.input ?? {}).length) / 4);
      else if (isToolResult(p)) n += Math.ceil(toolResultText(p).length / 4);
      else if (isData(p)) n += Math.ceil(p.data.length / 4);
    }
    return n;
  }
  return 0;
}

/** GET /models and /balance. Returns { ok, models, balance } or throws ApiError. */
async function checkConnection({ baseUrl, apiKey, fetch: f, signal }) {
  const doFetch = f || globalThis.fetch;
  const get = async (p) => {
    let res;
    try {
      res = await doFetch(`${baseUrl}${p}`, { headers: { authorization: `Bearer ${apiKey}`, "user-agent": USER_AGENT }, signal });
    } catch (err) {
      throw new ApiError(`UncensoredLLM: could not reach ${new URL(baseUrl).host} (${err && err.cause && err.cause.code ? err.cause.code : err && err.message})`);
    }
    let payload = null;
    try {
      payload = JSON.parse(await res.text());
    } catch {}
    if (!res.ok) throw describeHttpError(res.status, payload, res.headers.get("retry-after"));
    return payload;
  };
  const models = await get("/models");
  const ids = Array.isArray(models && models.data) ? models.data.map((m) => m.id) : [];
  let balance = null;
  try {
    balance = await get("/balance");
  } catch (err) {
    if (err.status === 401 || err.status === 403) throw err;
  }
  return { ok: true, models: ids, balance };
}

module.exports = {
  MODEL,
  DEFAULT_BASE_URL,
  KEYS_URL,
  normalizeBaseUrl,
  looksLikeKey,
  toOpenAIMessages,
  buildRequest,
  sseEvents,
  streamChat,
  estimateTokens,
  checkConnection,
  describeHttpError,
  ApiError,
};
