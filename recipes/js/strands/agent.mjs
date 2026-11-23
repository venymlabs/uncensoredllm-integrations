// Smallest Strands Agents (TypeScript SDK) agent on UncensoredLLM with one tool, over Chat Completions.
// npm install @strands-agents/sdk openai zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { Agent, tool } from '@strands-agents/sdk';
import { OpenAIModel } from '@strands-agents/sdk/models/openai';
import { z } from 'zod';

const model = new OpenAIModel({
  api: 'chat',
  modelId: 'uncensoredllm-1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  clientConfig: { baseURL: 'https://uncensoredllm.xyz/v1', maxRetries: 0 },
});

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  inputSchema: z.object({ city: z.string() }),
  callback: ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
});

const agent = new Agent({ model, tools: [getWeather], printer: false });
const result = await agent.invoke('What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.');
for (const m of agent.messages) for (const b of m.content ?? []) {
  if (b.type === 'toolUseBlock') console.log('tool-call', b.name, JSON.stringify(b.input));
  if (b.type === 'reasoningBlock') console.log('reasoning chars:', (b.text ?? '').length);
}
const text = String(result);
console.log('answer:', text);
process.exitCode = /\b4\b|four/i.test(text) ? 0 : 1;
