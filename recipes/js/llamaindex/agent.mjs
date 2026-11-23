// Smallest LlamaIndex.TS agent on UncensoredLLM with one tool.
// npm install llamaindex @llamaindex/openai @llamaindex/workflow zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { tool } from 'llamaindex';
import { OpenAI } from '@llamaindex/openai';
import { agent } from '@llamaindex/workflow';
import { z } from 'zod';

// @llamaindex/openai reports a 1024-token context window for any model id it does not know, and has no
// option to change it; memory and context trimming read that number. Override it with the real window.
class UncensoredLLM extends OpenAI {
  get metadata() {
    return { ...super.metadata, contextWindow: 262144 };
  }
}

const llm = new UncensoredLLM({
  model: 'uncensoredllm-1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  baseURL: 'https://uncensoredllm.xyz/v1',
  maxRetries: 0,
});

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  parameters: z.object({ city: z.string() }),
  execute: ({ city }) => JSON.stringify({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
});

const weatherAgent = agent({ llm, tools: [getWeather], verbose: false });
const result = await weatherAgent.run('What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.');
const text = String(result.data.result ?? result.data.message?.content ?? '');
console.log('supportToolCall:', llm.supportToolCall, 'contextWindow:', llm.metadata.contextWindow);
console.log('answer:', text);
process.exitCode = /\b4\b|four/i.test(text) ? 0 : 1;
