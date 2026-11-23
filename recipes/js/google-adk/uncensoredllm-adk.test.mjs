// Offline tests for the ADK model class (run next to an @google/adk install: node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJsonSchema, toChatRequest, fromChatResponse, UncensoredLLM } from './uncensoredllm-adk.mjs';

test('Gemini schema becomes JSON schema', () => {
  assert.deepEqual(
    toJsonSchema({ type: 'OBJECT', properties: { city: { type: 'STRING', nullable: true }, tags: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['city'], propertyOrdering: ['city'] }),
    { type: 'object', properties: { city: { type: ['string', 'null'] }, tags: { type: 'array', items: { type: 'string' } } }, required: ['city'] },
  );
});

test('request: system, history with a call and its response, tools, output floor', () => {
  const body = toChatRequest({
    contents: [
      { role: 'user', parts: [{ text: 'Weather?' }] },
      { role: 'model', parts: [{ text: 'thinking', thought: true }, { functionCall: { id: 'c1', name: 'get_weather', args: { city: 'Oslo' } } }] },
      { role: 'user', parts: [{ functionResponse: { id: 'c1', name: 'get_weather', response: { celsius: 4 } } }] },
    ],
    config: {
      systemInstruction: 'Be brief.',
      maxOutputTokens: 100,
      tools: [{ functionDeclarations: [{ name: 'get_weather', description: 'w', parameters: { type: 'OBJECT', properties: { city: { type: 'STRING' } } } }] }],
    },
    toolsDict: {},
    liveConnectConfig: {},
  }, 'uncensoredllm-1');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[2].content, null, 'thought text is not sent back');
  assert.equal(body.messages[2].tool_calls[0].id, 'c1');
  assert.deepEqual(body.messages[3], { role: 'tool', tool_call_id: 'c1', content: '{"celsius":4}' });
  assert.equal(body.tools[0].function.parameters.type, 'object');
  assert.equal(body.max_tokens, 512);
});

test('response: reasoning as thought part, tool calls, usage', () => {
  const r = fromChatResponse({
    model: 'uncensoredllm-1',
    choices: [{ message: { content: '', reasoning_content: 'r', tool_calls: [{ id: 'c1', function: { name: 'get_weather', arguments: '{"city":"Oslo"}' } }] }, finish_reason: 'tool_calls' }],
    usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7, completion_tokens_details: { reasoning_tokens: 2 } },
  });
  assert.deepEqual(r.content.parts[0], { text: 'r', thought: true });
  assert.deepEqual(r.content.parts[1].functionCall, { id: 'c1', name: 'get_weather', args: { city: 'Oslo' } });
  assert.equal(r.usageMetadata.thoughtsTokenCount, 2);
});

test('HTTP errors become an LlmResponse error', async () => {
  const m = new UncensoredLLM({ apiKey: 'vk-x', fetch: async () => new Response(JSON.stringify({ error: { message: 'Invalid API key.' } }), { status: 401 }) });
  const out = [];
  for await (const r of m.generateContentAsync({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], config: {} })) out.push(r);
  assert.equal(out[0].errorCode, '401');
  assert.match(out[0].errorMessage, /Invalid API key/);
});
