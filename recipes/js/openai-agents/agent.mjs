// Smallest OpenAI Agents SDK (JS) agent on UncensoredLLM with one tool, over the Responses API
// (the SDK's default). Set OPENAI_AGENTS_API=chat_completions to use Chat Completions instead.
// npm install @openai/agents zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { Agent, run, tool, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents';
import OpenAI from 'openai';
import { z } from 'zod';

setDefaultOpenAIClient(new OpenAI({ baseURL: 'https://uncensoredllm.xyz/v1', apiKey: process.env.UNCENSOREDLLM_API_KEY, maxRetries: 0 }));
setOpenAIAPI(process.env.OPENAI_AGENTS_API === 'chat_completions' ? 'chat_completions' : 'responses');
setTracingDisabled(true); // traces go to OpenAI by default and need an OpenAI key

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
});

const agent = new Agent({
  name: 'Weather agent',
  instructions: 'You answer weather questions. Always call get_weather for current conditions.',
  model: 'uncensoredllm-1',
  tools: [getWeather],
});

const result = await run(agent, 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.', { maxTurns: 4 });
for (const item of result.newItems) {
  if (item.type === 'tool_call_item') console.log('tool-call', item.rawItem.name, item.rawItem.arguments);
  if (item.type === 'tool_call_output_item') console.log('tool-result', JSON.stringify(item.output));
  if (item.type === 'reasoning_item') console.log('reasoning item:', JSON.stringify(item.rawItem).length, 'chars');
}
console.log('answer:', result.finalOutput);
process.exitCode = /\b4\b|four/i.test(String(result.finalOutput)) ? 0 : 1;
