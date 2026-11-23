// The same agent on ai 6.x through the /v6 entry (specification v3).
// npm install @uncensoredllm/ai-sdk-provider ai@6 zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider/v6';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: uncensoredllm('uncensoredllm-1'),
  prompt: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.',
  tools: {
    get_weather: tool({
      description: 'Get the current temperature in Celsius for a city.',
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
    }),
  },
  stopWhen: stepCountIs(4),
  maxRetries: 0,
});

let reasoningChars = 0;
for await (const part of result.fullStream) {
  if (part.type === 'reasoning-delta') reasoningChars += part.text.length;
  if (part.type === 'tool-call') console.log('tool-call', part.toolName, JSON.stringify(part.input));
  if (part.type === 'tool-result') console.log('tool-result', JSON.stringify(part.output));
  if (part.type === 'error') throw part.error;
}
const text = await result.text;
console.log('reasoning chars:', reasoningChars);
console.log('answer:', text);
process.exitCode = /\b4\b|four/i.test(text) ? 0 : 1;
