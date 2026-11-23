// Smallest VoltAgent agent on UncensoredLLM with one tool.
// VoltAgent 2.x runs on ai 6, so the model comes from @ai-sdk/openai-compatible 2.x (spec v3),
// not from @uncensoredllm/ai-sdk-provider (spec v4, ai 7 only).
// npm install @voltagent/core @ai-sdk/openai-compatible@2 zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { Agent, createTool } from '@voltagent/core';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

const uncensoredllm = createOpenAICompatible({
  name: 'uncensoredllm',
  baseURL: 'https://uncensoredllm.xyz/v1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  includeUsage: true,
});

const getWeather = createTool({
  name: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
});

const agent = new Agent({
  name: 'weather-agent',
  instructions: 'You answer weather questions. Always call get_weather for current conditions.',
  model: uncensoredllm('uncensoredllm-1'),
  tools: [getWeather],
});

const res = await agent.generateText('What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.', { maxSteps: 4 });
for (const s of res.steps ?? []) for (const c of s.toolCalls ?? []) console.log('tool-call', c.toolName, JSON.stringify(c.input ?? c.args));
console.log('reasoning chars:', (res.reasoningText ?? '').length);
console.log('answer:', res.text);
// VoltAgent keeps background handles open after the call, so a script has to exit explicitly.
process.exit(/\b4\b|four/i.test(res.text) ? 0 : 1);
