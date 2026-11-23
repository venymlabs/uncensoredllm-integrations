/* globals describe, it, expect */
// Schema validation always runs. Live tests need RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY.
const zapier = require('zapier-platform-core');
const { validateAppDefinition } = require('zapier-platform-schema');
const App = require('../index');

const appTester = zapier.createAppTester(App);
const KEY = (process.env.UNCENSOREDLLM_API_KEY || '').trim();
const LIVE = process.env.RUN_UNCENSOREDLLM_LIVE === '1' && !!KEY;
const live = LIVE ? it : it.skip;

describe('uncensoredllm-zapier', () => {
  it('passes the Zapier app schema (the same validate command the CLI runs)', async () => {
    const handler = zapier.createAppHandler(App);
    const res = await new Promise((resolve, reject) =>
      handler({ command: 'validate', platformVersion: zapier.version }, {}, (err, out) => (err ? reject(err) : resolve(out))),
    );
    expect(res.results).toEqual([]);
  });

  it('has the fields the schema module asks for', () => {
    expect(typeof validateAppDefinition).toBe('function');
    expect(App.authentication.fields[0].type).toBe('password');
  });

  live('rejects a bad key in the auth test', async () => {
    await expect(appTester(App.authentication.test, { authData: { api_key: 'vk-not-a-real-key' } })).rejects.toThrow(/not accepted/);
  });

  live('passes the auth test with a good key', async () => {
    const res = await appTester(App.authentication.test, { authData: { api_key: KEY } });
    expect(typeof res.balance_usd).toBe('number');
  });

  live('sends a prompt', async () => {
    const out = await appTester(App.creates.send_prompt.operation.perform, {
      authData: { api_key: KEY },
      inputData: { prompt: 'Reply with the single word: ready', max_tokens: 100 },
    });
    expect(out.text.toLowerCase()).toContain('ready');
    expect(out.finish_reason).toBe('stop');
  });
});
