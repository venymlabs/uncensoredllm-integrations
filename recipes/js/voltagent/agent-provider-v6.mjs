// The same VoltAgent agent with the provider package's ai 6 entry (/v6, specification v3).
// The main entry (v4, ai 7) is rejected by VoltAgent 2.x: see agent-provider-v4.mjs.
// npm install @voltagent/core @uncensoredllm/ai-sdk-provider zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { Agent, createTool } from '@voltagent/core';
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider/v6';
import { z } from 'zod';


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
