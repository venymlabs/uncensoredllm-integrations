// Live tests against the real API. Needs UNCENSOREDLLM_API_KEY; skipped without it.
// Runs one request at a time (trial keys allow one in flight and 10 a minute).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateText, streamText, tool, stepCountIs, Output } from 'ai';
import { z } from 'zod';
import { uncensoredllm } from '../dist/index.js';

const skip = !process.env.UNCENSOREDLLM_API_KEY && 'UNCENSOREDLLM_API_KEY not set';
const pause = () => new Promise((r) => setTimeout(r, 6500));

test('generateText returns text and reasoning', { skip }, async () => {
  const r = await generateText({ model: uncensoredllm(), prompt: 'Reply with the single word: ready', maxRetries: 0 });
  assert.match(r.text, /ready/i);
  assert.ok((r.reasoningText ?? '').length > 0, 'reasoning surfaced');
  assert.ok(r.usage.outputTokens > 0);
  await pause();
});

test('streamText agent: tool call, tool result, answer', { skip }, async () => {
  let called = 0;
  const result = streamText({
    model: uncensoredllm('uncensoredllm-1'),
    prompt: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.',
    tools: {
      get_weather: tool({
        description: 'Get the current temperature in Celsius for a city.',
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => { called++; return { city, celsius: 4 }; },
      }),
    },
    stopWhen: stepCountIs(4),
    providerOptions: { uncensoredllm: { reasoningMode: 'fast' } },
    maxRetries: 0,
  });
  let reasoningDeltas = 0;
  for await (const p of result.fullStream) {
    if (p.type === 'reasoning-delta') reasoningDeltas++;
    if (p.type === 'error') throw p.error;
  }
  assert.ok(called >= 1, 'tool executed');
  assert.match(await result.text, /\b4\b|four/i);
  assert.ok(reasoningDeltas > 0, 'reasoning streamed');
  await pause();
});

test('structured output (json_schema)', { skip }, async () => {
  const r = await generateText({
    model: uncensoredllm(),
    prompt: 'Give the capital of Norway and its country.',
    output: Output.object({ schema: z.object({ city: z.string(), country: z.string() }) }),
    providerOptions: { uncensoredllm: { reasoningMode: 'fast' } },
    maxRetries: 0,
  });
  assert.match(r.output.city, /oslo/i);
});
