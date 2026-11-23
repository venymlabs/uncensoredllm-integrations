'use strict';

// Zapier Platform CLI integration for UncensoredLLM (https://uncensoredllm.xyz).
// The key is stored by Zapier as a password field of the connection and is sent only to
// https://uncensoredllm.xyz/v1, as an Authorization: Bearer header.

const { version } = require('./package.json');
const { version: platformVersion } = require('zapier-platform-core');

const BASE_URL = 'https://uncensoredllm.xyz/v1';
const MODEL_ID = 'uncensoredllm-1';
// The model reasons before it answers. A budget under about 400 tokens can be spent on the
// reasoning alone (the API answers 502 empty_completion), so a smaller value is raised to this.
const MIN_MAX_TOKENS = 512;

const addBearer = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.api_key && request.url.startsWith(BASE_URL)) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
  }
  return request;
};

const handleErrors = (response, z) => {
  if (response.status >= 400) {
    let message = `HTTP ${response.status}`;
    try {
      const err = response.json && response.json.error;
      if (err) message = `${response.status}: ${err.message || err.code}`;
    } catch (e) {
      // keep the status line
    }
    if (response.status === 401) throw new z.errors.Error('The API key was not accepted. Paste the whole vk- key.', 'AuthenticationError', 401);
    throw new z.errors.Error(`UncensoredLLM ${message}`, 'ApiError', response.status);
  }
  return response;
};

const authentication = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText: 'Your UncensoredLLM key, starting with `vk-`. Create one at [uncensoredllm.xyz](https://uncensoredllm.xyz).',
    },
  ],
  // GET /balance needs a valid key and costs nothing.
  test: { url: `${BASE_URL}/balance`, method: 'GET' },
  connectionLabel: 'UncensoredLLM ({{json.plan}})',
};

const sendPrompt = {
  key: 'send_prompt',
  noun: 'Reply',
  display: {
    label: 'Send Prompt',
    description: 'Sends a prompt to UncensoredLLM 1 and returns the reply.',
  },
  operation: {
    inputFields: [
      { key: 'prompt', label: 'Prompt', type: 'text', required: true },
      { key: 'system', label: 'System Message', type: 'text', required: false, helpText: 'Instructions sent before the prompt.' },
      {
        key: 'reasoning_mode',
        label: 'Reasoning',
        choices: { fast: 'Fast', extended: 'Extended' },
        default: 'fast',
        required: false,
        helpText:
          'How much the model reasons before it answers. Fast is the default here because a Zapier action has a time limit; Extended can take longer than that on hard prompts.',
      },
      {
        key: 'max_tokens',
        label: 'Maximum Tokens',
        type: 'integer',
        required: false,
        helpText: 'Upper limit on the reply, reasoning included. Leave empty, or use 512 or more.',
      },
      { key: 'temperature', label: 'Temperature', type: 'number', required: false, helpText: 'Between 0 and 2.' },
      { key: 'json_output', label: 'JSON Output', type: 'boolean', default: 'false', required: false, helpText: 'The reply is a JSON object. Ask for JSON in the prompt too.' },
    ],
    perform: async (z, bundle) => {
      const d = bundle.inputData;
      const messages = [];
      if (d.system) messages.push({ role: 'system', content: d.system });
      messages.push({ role: 'user', content: d.prompt });
      const body = { model: MODEL_ID, messages, reasoning_mode: d.reasoning_mode || 'fast' };
      if (d.max_tokens !== undefined && d.max_tokens !== null && d.max_tokens !== '') body.max_tokens = Math.max(MIN_MAX_TOKENS, Number(d.max_tokens));
      if (d.temperature !== undefined && d.temperature !== null && d.temperature !== '') body.temperature = Number(d.temperature);
      if (d.json_output === true || d.json_output === 'true') body.response_format = { type: 'json_object' };

      const response = await z.request({ url: `${BASE_URL}/chat/completions`, method: 'POST', body });
      const data = response.json;
      const choice = (data.choices && data.choices[0]) || {};
      return {
        id: data.id,
        text: (choice.message && choice.message.content) || '',
        finish_reason: choice.finish_reason || null,
        prompt_tokens: data.usage ? data.usage.prompt_tokens : null,
        completion_tokens: data.usage ? data.usage.completion_tokens : null,
      };
    },
    sample: {
      id: 'chatcmpl-123',
      text: 'Hello.',
      finish_reason: 'stop',
      prompt_tokens: 12,
      completion_tokens: 40,
    },
    outputFields: [
      { key: 'id', label: 'Completion ID' },
      { key: 'text', label: 'Reply' },
      { key: 'finish_reason', label: 'Finish Reason' },
      { key: 'prompt_tokens', label: 'Prompt Tokens', type: 'integer' },
      { key: 'completion_tokens', label: 'Completion Tokens', type: 'integer' },
    ],
  },
};

const getBalance = {
  key: 'balance',
  noun: 'Balance',
  display: {
    label: 'Get Balance',
    description: 'Reads the credit left on the account.',
  },
  operation: {
    inputFields: [],
    perform: async (z) => {
      const response = await z.request({ url: `${BASE_URL}/balance`, method: 'GET' });
      // A search returns a list.
      return [{ id: 'balance', ...response.json }];
    },
    sample: { id: 'balance', balance_usd: 4.2, plan: 'payg' },
  },
};

module.exports = {
  version,
  platformVersion,
  authentication,
  beforeRequest: [addBearer],
  afterResponse: [handleErrors],
  triggers: {},
  searches: { [getBalance.key]: getBalance },
  creates: { [sendPrompt.key]: sendPrompt },
  resources: {},
};
