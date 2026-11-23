// Offline tests of the ai 6 entry point (`/v6`, specification v3) against ai@6, with a fake fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateText, streamText, tool, stepCountIs } from 'ai-v6';
import { z } from 'zod';
import { createUncensoredLLM, UNCENSOREDLLM_CONTEXT_WINDOW } from '../dist/v6.js';

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
const chunk = (delta, finish = null, usage) => ({
  id: 'c', object: 'chat.completion.chunk', created: 1, model: 'uncensoredllm-1',
  choices: delta === null ? [] : [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}),
});
const completion = (message) => ({
  id: 'c', object: 'chat.completion', created: 1, model: 'uncensoredllm-1',
  choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
});

test('v6: spec v3, tool loop with streamed reasoning', async () => {
  const { fetch, calls } = fakeFetch([
    { sse: [chunk({ role: 'assistant', reasoning_content: 'Use the tool.' }), chunk({ tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'weather', arguments: '{"city":"Oslo"}' } }] }), chunk({}, 'tool_calls'), chunk(null, null, { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 }), '[DONE]'] },
    { sse: [chunk({ role: 'assistant', content: '4 C in Oslo.' }), chunk({}, 'stop'), chunk(null, null, { prompt_tokens: 9, completion_tokens: 3, total_tokens: 12 }), '[DONE]'] },
  ]);
  const p = createUncensoredLLM({ apiKey: 'vk-test', fetch });
  assert.equal(p.specificationVersion, 'v3');
  assert.equal(p().specificationVersion, 'v3');
  const r = streamText({
    model: p(),
    prompt: 'Weather in Oslo?',
    tools: { weather: tool({ description: 'w', inputSchema: z.object({ city: z.string() }), execute: async ({ city }) => ({ city, celsius: 4 }) }) },
    stopWhen: stepCountIs(3),
  });
  const kinds = new Set();
  for await (const part of r.fullStream) kinds.add(part.type);
  assert.equal(await r.text, '4 C in Oslo.');
  assert.ok(kinds.has('reasoning-delta') && kinds.has('tool-result'));
  assert.equal(calls[0].headers.authorization, 'Bearer vk-test');
  assert.equal(calls[1].body.messages.find((m) => m.role === 'tool').tool_call_id, 'call_1');
});

test('v6: max_tokens floor and reasoningMode mapping are shared with the v7 entry', async () => {
  const { fetch, calls } = fakeFetch([{ json: completion({ content: 'ok', reasoning_content: 'r' }) }]);
  const r = await generateText({
    model: createUncensoredLLM({ apiKey: 'k', fetch })(),
    prompt: 'x',
    maxOutputTokens: 64,
    providerOptions: { uncensoredllm: { reasoningMode: 'fast' } },
  });
  assert.equal(calls[0].body.max_tokens, 512);
  assert.equal(calls[0].body.reasoning_mode, 'fast');
  assert.equal(r.reasoningText, 'r');
  assert.equal(UNCENSOREDLLM_CONTEXT_WINDOW, 262144);
});

test('v6: embeddings refused', () => {
  assert.throws(() => createUncensoredLLM({ apiKey: 'k' }).embeddingModel('x'), /does not serve embeddings/);
});
