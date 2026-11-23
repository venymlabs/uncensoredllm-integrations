// Smallest Mastra agent on UncensoredLLM with one tool, using Mastra's built-in
// OpenAI-compatible model config (no extra package).
// npm install @mastra/core zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const getWeather = createTool({
  id: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
});

const agent = new Agent({
  id: 'weather-agent',
  name: 'Weather agent',
  instructions: 'You answer weather questions. Always call get_weather for current conditions.',
  model: {
    id: 'uncensoredllm/uncensoredllm-1',
    url: 'https://uncensoredllm.xyz/v1',
    apiKey: process.env.UNCENSOREDLLM_API_KEY,
  },
  tools: { getWeather },
});

const res = await agent.generate('What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.', { maxSteps: 4 });
for (const step of res.steps ?? []) for (const c of step.toolCalls ?? []) console.log('tool-call', c.payload?.toolName ?? c.toolName, JSON.stringify(c.payload?.args ?? c.input ?? c.args));
console.log('reasoning chars:', (res.reasoningText ?? '').length);
console.log('answer:', res.text);
process.exitCode = /\b4\b|four/i.test(res.text) ? 0 : 1;
