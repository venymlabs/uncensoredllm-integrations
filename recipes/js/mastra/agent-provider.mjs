// The same Mastra agent with the UncensoredLLM AI SDK provider as its model,
// streamed, so reasoning arrives as reasoning parts.
// npm install @mastra/core @uncensoredllm/ai-sdk-provider zod
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider';
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
  model: uncensoredllm('uncensoredllm-1'),
  tools: { getWeather },
});

const stream = await agent.stream('What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.', {
  maxSteps: 4,
  providerOptions: { uncensoredllm: { reasoningMode: 'fast' } },
});
let reasoning = 0;
for await (const chunk of stream.fullStream) {
  if (chunk.type === 'reasoning-delta') reasoning += (chunk.payload?.text ?? '').length;
  if (chunk.type === 'tool-call') console.log('tool-call', chunk.payload.toolName, JSON.stringify(chunk.payload.args));
  if (chunk.type === 'tool-result') console.log('tool-result', JSON.stringify(chunk.payload.result));
  if (chunk.type === 'error') throw chunk.payload?.error ?? new Error('stream error');
}
const text = await stream.text;
console.log('reasoning chars:', reasoning);
console.log('answer:', text);
process.exitCode = /\b4\b|four/i.test(text) ? 0 : 1;
