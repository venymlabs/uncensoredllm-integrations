// Smallest Google ADK (TypeScript/JavaScript) agent on UncensoredLLM with one tool,
// using the UncensoredLLM model class from uncensoredllm-adk.mjs (next to this file).
// npm install @google/adk zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { LlmAgent, FunctionTool, InMemoryRunner } from '@google/adk';
import { z } from 'zod';
import { UncensoredLLM } from './uncensoredllm-adk.mjs';

const getWeather = new FunctionTool({
  name: 'get_weather',
  description: 'Get the current temperature in Celsius for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
});

const agent = new LlmAgent({
  name: 'weather_agent',
  model: new UncensoredLLM({ reasoningMode: 'fast' }),
  instruction: 'You answer weather questions. Always call get_weather for current conditions.',
  tools: [getWeather],
});

const runner = new InMemoryRunner({ agent, appName: 'weather' });
let answer = '';
for await (const event of runner.runEphemeral({
  userId: 'u1',
  newMessage: { role: 'user', parts: [{ text: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.' }] },
})) {
  if (event.errorCode) throw new Error(`${event.errorCode}: ${event.errorMessage}`);
  for (const p of event.content?.parts ?? []) {
    if (p.functionCall) console.log('tool-call', p.functionCall.name, JSON.stringify(p.functionCall.args));
    if (p.functionResponse) console.log('tool-result', JSON.stringify(p.functionResponse.response));
    if (p.thought) console.log('thought chars:', p.text.length);
    else if (p.text && event.author === 'weather_agent') answer = p.text;
  }
}
console.log('answer:', answer);
process.exitCode = /\b4\b|four/i.test(answer) ? 0 : 1;
