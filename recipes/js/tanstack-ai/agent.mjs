// Smallest TanStack AI agent on UncensoredLLM with one server tool (auto-executed agent loop).
// npm install @tanstack/ai @tanstack/ai-openai zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { chat, toolDefinition, maxIterations } from '@tanstack/ai';
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';
import { z } from 'zod';

const adapter = openaiCompatibleText('uncensoredllm-1', {
  name: 'uncensoredllm',
  baseURL: 'https://uncensoredllm.xyz/v1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  api: 'chat-completions',
  maxRetries: 0,
});

const getWeather = toolDefinition({
  name: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  inputSchema: z.object({ city: z.string() }),
}).server(async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }));

const stream = chat({
  adapter,
  messages: [{ role: 'user', content: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.' }],
  tools: [getWeather],
  agentLoopStrategy: maxIterations(4),
  threadId: 'weather-demo',
});

let text = '';
const seen = {};
for await (const chunk of stream) {
  seen[chunk.type] = (seen[chunk.type] ?? 0) + 1;
  if (chunk.type === 'TOOL_CALL_START') console.log('tool-call', chunk.toolName ?? chunk.toolCallName);
  if (chunk.type === 'TEXT_MESSAGE_CONTENT') text += chunk.delta ?? '';
  if (chunk.type === 'RUN_ERROR') throw new Error(JSON.stringify(chunk));
}
console.log('chunk types:', JSON.stringify(seen));
console.log('answer:', text);
process.exitCode = /\b4\b|four/i.test(text) ? 0 : 1;
