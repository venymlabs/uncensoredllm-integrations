// Smallest Genkit (JS) tool-calling flow on UncensoredLLM, through the OpenAI-compatible plugin.
// npm install genkit @genkit-ai/compat-oai ; export UNCENSOREDLLM_API_KEY=vk-...
import { genkit, z } from 'genkit';
import { openAICompatible } from '@genkit-ai/compat-oai';

const ai = genkit({
  plugins: [
    openAICompatible({
      name: 'uncensoredllm',
      apiKey: process.env.UNCENSOREDLLM_API_KEY,
      baseURL: 'https://uncensoredllm.xyz/v1',
      maxRetries: 0,
      // Optional. The plugin bundles openai@4, which otherwise uses its own node-fetch; the global fetch
      // is passed here instead. Optional.
      fetch: (url, init) => globalThis.fetch(url, init),
    }),
  ],
});

const getWeather = ai.defineTool(
  { name: 'get_weather', description: 'Get the current temperature in Celsius for a city.', inputSchema: z.object({ city: z.string() }) },
  async ({ city }) => ({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
);

const res = await ai.generate({
  model: 'uncensoredllm/uncensoredllm-1',
  prompt: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.',
  tools: [getWeather],
  maxTurns: 4,
});
for (const m of res.messages) for (const p of m.content) {
  if (p.toolRequest) console.log('tool-call', p.toolRequest.name, JSON.stringify(p.toolRequest.input));
  if (p.toolResponse) console.log('tool-result', JSON.stringify(p.toolResponse.output));
}
console.log('reasoning chars:', (res.reasoning ?? '').length);
console.log('answer:', res.text);
process.exitCode = /\b4\b|four/i.test(res.text) ? 0 : 1;
