import { createAction, Property } from '@activepieces/pieces-framework';
import { uncensoredllmAuth } from '../auth';
import { callApi, MIN_MAX_TOKENS, MODEL_ID } from '../common';

type ChatResponse = {
  choices?: { message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string }[];
  usage?: Record<string, unknown>;
};

export const askUncensoredllm = createAction({
  auth: uncensoredllmAuth,
  name: 'ask_uncensoredllm',
  displayName: 'Ask UncensoredLLM',
  description: 'Send a prompt to UncensoredLLM 1 and get the reply.',
  audience: 'both',
  aiMetadata: {
    description:
      'Sends one prompt, with an optional system message, to the UncensoredLLM chat model and returns the reply text and token usage. Stateless: each call is a fresh completion.',
    idempotent: false,
  },
  props: {
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
    }),
    systemMessage: Property.LongText({
      displayName: 'System Message',
      description: 'Instructions sent before the prompt.',
      required: false,
    }),
    reasoningMode: Property.StaticDropdown({
      displayName: 'Reasoning',
      description: 'How much the model reasons before it answers. Fast keeps it short.',
      required: false,
      defaultValue: 'extended',
      options: {
        options: [
          { label: 'Extended', value: 'extended' },
          { label: 'Fast', value: 'fast' },
        ],
      },
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      description:
        'Upper limit on the reply, reasoning included. Leave empty to let the server decide; otherwise use 512 or more.',
      required: false,
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      description: 'Between 0 and 2. Lower is more focused, higher is more varied.',
      required: false,
    }),
    jsonOutput: Property.Checkbox({
      displayName: 'JSON Output',
      description: 'The reply is a JSON object. Ask for JSON in the prompt too.',
      required: false,
      defaultValue: false,
    }),
    includeReasoning: Property.Checkbox({
      displayName: 'Include Reasoning',
      description: "Add the model's reasoning to the output.",
      required: false,
      defaultValue: false,
    }),
  },
  async run({ auth, propsValue }) {
    const messages: { role: string; content: string }[] = [];
    if (propsValue.systemMessage) messages.push({ role: 'system', content: propsValue.systemMessage });
    messages.push({ role: 'user', content: propsValue.prompt });

    const body: Record<string, unknown> = { model: MODEL_ID, messages };
    if (propsValue.reasoningMode) body['reasoning_mode'] = propsValue.reasoningMode;
    if (typeof propsValue.maxTokens === 'number') body['max_tokens'] = Math.max(MIN_MAX_TOKENS, propsValue.maxTokens);
    if (typeof propsValue.temperature === 'number') body['temperature'] = propsValue.temperature;
    if (propsValue.jsonOutput) body['response_format'] = { type: 'json_object' };

    const res = await callApi<ChatResponse>(auth.secret_text, 'POST', '/chat/completions', body);
    const choice = res.choices?.[0];
    return {
      text: choice?.message?.content ?? '',
      finish_reason: choice?.finish_reason ?? null,
      usage: res.usage ?? null,
      ...(propsValue.includeReasoning ? { reasoning: choice?.message?.reasoning_content ?? null } : {}),
    };
  },
});
