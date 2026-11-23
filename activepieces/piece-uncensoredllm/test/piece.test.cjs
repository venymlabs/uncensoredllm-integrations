// Runs against the compiled piece (npm run build first). Live tests need RUN_UNCENSOREDLLM_LIVE=1
// and UNCENSOREDLLM_API_KEY; each makes one short request, one after another.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { uncensoredllm } = require(path.join(__dirname, '..', 'dist', 'src', 'index.js'));
const KEY = (process.env.UNCENSOREDLLM_API_KEY || '').trim();
const LIVE = process.env.RUN_UNCENSOREDLLM_LIVE === '1' && !!KEY;
const live = { skip: !LIVE && 'set RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY' };

const actions = uncensoredllm.actions();
const ctx = (propsValue) => ({ auth: { type: 'SECRET_TEXT', secret_text: KEY }, propsValue, store: {}, server: {} });

test('piece metadata', () => {
  const meta = uncensoredllm.metadata();
  assert.equal(meta.displayName, 'UncensoredLLM');
  assert.deepEqual(Object.keys(actions).sort(), ['ask_uncensoredllm', 'get_balance']);
  assert.equal(meta.auth.type, 'SECRET_TEXT');
  assert.ok(meta.categories.includes('ARTIFICIAL_INTELLIGENCE'));
});

test('auth rejects a bad key', live, async () => {
  const r = await uncensoredllm.auth.validate({ auth: 'vk-not-a-real-key', server: {} });
  assert.equal(r.valid, false);
  assert.match(r.error, /401/);
});

test('auth accepts the key', live, async () => {
  const r = await uncensoredllm.auth.validate({ auth: KEY, server: {} });
  assert.deepEqual(r, { valid: true });
});

test('get balance', live, async () => {
  const r = await actions.get_balance.run(ctx({}));
  assert.equal(typeof r.balance_usd, 'number');
});

test('ask', live, async () => {
  const r = await actions.ask_uncensoredllm.run(
    ctx({ prompt: 'Reply with the single word: ready', reasoningMode: 'fast', maxTokens: 100, includeReasoning: true }),
  );
  assert.match(r.text.toLowerCase(), /ready/);
  assert.equal(r.finish_reason, 'stop');
  assert.ok(typeof r.reasoning === 'string' || r.reasoning === null);
});

test('TLS checks stay on after the requests', () => {
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0');
});
