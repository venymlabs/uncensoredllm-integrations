// Offline tests: a fake fetch returns recorded-shape API responses; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateText, streamText, tool, stepCountIs, Output } from 'ai';
import { z } from 'zod';
import { createUncensoredLLM, transformUncensoredLLMRequestBody, uncensoredllmModelEntry, UNCENSOREDLLM_CONTEXT_WINDOW } from '../dist/index.js';

function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), headers: Object.fromEntries(new Headers(init.headers).entries()), body: JSON.parse(init.body) });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (r.sse) {
      const text = r.sse.map((c) => `data: ${typeof c === 'string' ? c : JSON.stringify(c)}\n\n`).join('');
      return new Response(text, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}

const completion = (message, finish = 'stop') => ({
  id: 'chatcmpl-1', object: 'chat.completion', created: 1, model: 'uncensoredllm-1',
  choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: finish }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
});
const chunk = (delta, finish = null, usage) => ({
  id: 'chatcmpl-2', object: 'chat.completion.chunk', created: 1, model: 'uncensoredllm-1',
  choices: delta === null ? [] : [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}),
});

test('generateText: url, auth, model id, reasoning_content surfaced as reasoning', async () => {
  const { fetch, calls } = fakeFetch([{ json: completion({ content: 'Hello.', reasoning_content: 'The user greets me.' }) }]);
  const p = createUncensoredLLM({ apiKey: 'vk-test', fetch });
  const r = await generateText({ model: p(), prompt: 'Say hello.' });
  assert.equal(calls[0].url, 'https://uncensoredllm.xyz/v1/chat/completions');
  assert.equal(calls[0].headers.authorization, 'Bearer vk-test');
  // ai@7 sets its own user-agent per call ("ai/7.x ai-sdk-provider-utils/5.x node.js/..."), replacing a provider suffix.
  assert.match(calls[0].headers['user-agent'], /^ai\/7\./);
  assert.equal(calls[0].body.model, 'uncensoredllm-1');
  assert.equal(calls[0].body.max_tokens, undefined, 'max_tokens stays unset unless asked for');
  assert.equal(r.text, 'Hello.');
  assert.equal(r.reasoningText, 'The user greets me.');
  assert.equal(r.usage.inputTokens, 10);
});

test('streamText: reasoning deltas, tool call, tool result sent back, final text (2 steps)', async () => {
  const step1 = [
    chunk({ role: 'assistant', reasoning_content: 'Need the ' }),
    chunk({ reasoning_content: 'weather tool.' }),
    chunk({ tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'weather', arguments: '' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: '{"city":' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: '"Oslo"}' } }] }),
    chunk({}, 'tool_calls'),
    chunk(null, null, { prompt_tokens: 50, completion_tokens: 12, total_tokens: 62 }),
    '[DONE]',
  ];
  const step2 = [
    chunk({ role: 'assistant', reasoning_content: 'Report it.' }),
    chunk({ content: 'It is 4 C in Oslo.' }),
    chunk({}, 'stop'),
    chunk(null, null, { prompt_tokens: 80, completion_tokens: 9, total_tokens: 89 }),
    '[DONE]',
  ];
  const { fetch, calls } = fakeFetch([{ sse: step1 }, { sse: step2 }]);
  const p = createUncensoredLLM({ apiKey: 'vk-test', fetch });
  let executed = null;
  const result = streamText({
    model: p('uncensoredllm-1'),
    prompt: 'Weather in Oslo?',
    tools: {
      weather: tool({
        description: 'Current weather for a city',
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => { executed = city; return { city, celsius: 4 }; },
      }),
    },
    stopWhen: stepCountIs(3),
  });
  const kinds = [];
  for await (const part of result.fullStream) kinds.push(part.type);
  assert.equal(executed, 'Oslo');
  assert.equal(await result.text, 'It is 4 C in Oslo.');
  assert.ok(kinds.includes('reasoning-delta'), `reasoning-delta in ${kinds}`);
  assert.ok(kinds.includes('tool-call') && kinds.includes('tool-result'));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.stream, true);
  assert.deepEqual(calls[0].body.stream_options, { include_usage: true });
  assert.equal(calls[0].body.tools[0].function.name, 'weather');
  const toolMsg = calls[1].body.messages.find((m) => m.role === 'tool');
  assert.equal(toolMsg.tool_call_id, 'call_1');
  assert.deepEqual(JSON.parse(toolMsg.content), { city: 'Oslo', celsius: 4 });
  const steps = await result.steps;
  assert.equal(steps[0].reasoningText, 'Need the weather tool.');
  assert.equal((await result.totalUsage).inputTokens, 130);
});

test('maxOutputTokens below 512 is raised with a warning; minOutputTokens: 0 turns that off', async () => {
  const { fetch, calls } = fakeFetch([{ json: completion({ content: 'ok' }) }]);
  const r = await generateText({ model: createUncensoredLLM({ apiKey: 'k', fetch })(), prompt: 'x', maxOutputTokens: 100 });
  assert.equal(calls[0].body.max_tokens, 512);
  assert.ok(r.warnings.some((w) => w.feature === 'maxOutputTokens'));
  await generateText({ model: createUncensoredLLM({ apiKey: 'k', fetch, minOutputTokens: 0 })(), prompt: 'x', maxOutputTokens: 100 });
  assert.equal(calls[1].body.max_tokens, 100);
  await generateText({ model: createUncensoredLLM({ apiKey: 'k', fetch })(), prompt: 'x', maxOutputTokens: 1_000_000 });
  assert.equal(calls[2].body.max_tokens, 65536);
});

test('reasoningMode provider option and the top-level reasoning option become reasoning_mode', async () => {
  const { fetch, calls } = fakeFetch([{ json: completion({ content: 'ok' }) }]);
  const model = createUncensoredLLM({ apiKey: 'k', fetch })();
  await generateText({ model, prompt: 'x', providerOptions: { uncensoredllm: { reasoningMode: 'fast', min_p: 0.05 } } });
  assert.equal(calls[0].body.reasoning_mode, 'fast');
  assert.equal(calls[0].body.min_p, 0.05, 'unknown snake_case options pass through');
  assert.equal(calls[0].body.reasoningMode, undefined);
  await generateText({ model, prompt: 'x', reasoning: 'low' });
  assert.equal(calls[1].body.reasoning_mode, 'fast');
  assert.equal(calls[1].body.reasoning_effort, undefined);
  await generateText({ model, prompt: 'x', reasoning: 'high' });
  assert.equal(calls[2].body.reasoning_mode, 'extended');
  await generateText({ model, prompt: 'x' });
  assert.equal(calls[3].body.reasoning_mode, undefined, 'API default when nothing is asked');
});

test('structured output is sent as json_schema', async () => {
  const { fetch, calls } = fakeFetch([{ json: completion({ content: '{"name":"Oslo","country":"Norway"}' }) }]);
  const r = await generateText({
    model: createUncensoredLLM({ apiKey: 'k', fetch })(),
    prompt: 'A city',
    output: Output.object({ schema: z.object({ name: z.string(), country: z.string() }) }),
  });
  assert.equal(calls[0].body.response_format.type, 'json_schema');
  assert.deepEqual(r.output, { name: 'Oslo', country: 'Norway' });
});

test('API errors surface as APICallError with the API message', async () => {
  const { fetch } = fakeFetch([{ status: 401, json: { error: { message: 'Invalid API key.', type: 'invalid_request_error', code: 'invalid_api_key' } } }]);
  await assert.rejects(
    generateText({ model: createUncensoredLLM({ apiKey: 'vk-bad', fetch })(), prompt: 'x', maxRetries: 0 }),
    (e) => e.statusCode === 401 && /Invalid API key/.test(e.message),
  );
});

test('missing key names the environment variable', async () => {
  const saved = process.env.UNCENSOREDLLM_API_KEY;
  delete process.env.UNCENSOREDLLM_API_KEY;
  try {
    const { fetch } = fakeFetch([{ json: completion({ content: 'ok' }) }]);
    await assert.rejects(generateText({ model: createUncensoredLLM({ fetch })(), prompt: 'x' }), /UNCENSOREDLLM_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.UNCENSOREDLLM_API_KEY = saved;
  }
});

test('baseURL from settings or UNCENSOREDLLM_BASE_URL, trailing slash removed', async () => {
  const { fetch, calls } = fakeFetch([{ json: completion({ content: 'ok' }) }]);
  await generateText({ model: createUncensoredLLM({ apiKey: 'k', fetch, baseURL: 'http://localhost:9/v1/' })(), prompt: 'x' });
  assert.equal(calls[0].url, 'http://localhost:9/v1/chat/completions');
  process.env.UNCENSOREDLLM_BASE_URL = 'http://127.0.0.1:8/v1';
  try {
    await generateText({ model: createUncensoredLLM({ apiKey: 'k', fetch })(), prompt: 'x' });
    assert.equal(calls[1].url, 'http://127.0.0.1:8/v1/chat/completions');
  } finally {
    delete process.env.UNCENSOREDLLM_BASE_URL;
  }
});

test('provider shape: v4 spec, embeddings and images refused, catalog entry', () => {
  const p = createUncensoredLLM({ apiKey: 'k' });
  assert.equal(p.specificationVersion, 'v4');
  const m = p.languageModel('uncensoredllm-1');
  assert.equal(m.specificationVersion, 'v4');
  assert.equal(m.provider, 'uncensoredllm.chat');
  assert.throws(() => p.embeddingModel('x'), /does not serve embeddings/);
  assert.throws(() => p.imageModel('x'), /does not serve images/);
  assert.throws(() => new p(), /new keyword/);
  assert.equal(uncensoredllmModelEntry.requestConfig.contextWindow, UNCENSOREDLLM_CONTEXT_WINDOW);
});

test('transform is idempotent and leaves an explicit reasoning_mode alone', () => {
  const w = [];
  const once = transformUncensoredLLMRequestBody({ max_tokens: 10, reasoning_mode: 'extended', reasoning_effort: 'low' }, w, 512);
  assert.deepEqual(once, { max_tokens: 512, reasoning_mode: 'extended' });
  assert.deepEqual(transformUncensoredLLMRequestBody(once, [], 512), once);
});
