// Smallest LangChain.js (v1) agent on UncensoredLLM with one tool.
// npm install langchain @langchain/core @langchain/openai zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { createAgent, tool } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// createAgent names every AI message after the agent node ("model"), and the API answers 400
// ("tool-call author name `model` is incompatible with `tool_name` mode") when an assistant message
// that carries tool_calls also carries a `name`. Until the API ignores that field, drop it on the way out.
const dropAssistantNames = async (url, init) => {
  if (init?.body && typeof init.body === 'string') {
    const body = JSON.parse(init.body);
    if (Array.isArray(body.messages)) {
      for (const m of body.messages) if (m.role === 'assistant') delete m.name;
      init = { ...init, body: JSON.stringify(body) };
    }
  }
  return fetch(url, init);
};

const model = new ChatOpenAI({
  model: 'uncensoredllm-1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  configuration: { baseURL: 'https://uncensoredllm.xyz/v1', fetch: dropAssistantNames },
  maxRetries: 0,
});

const getWeather = tool(
  async ({ city }) => JSON.stringify({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
  { name: 'get_weather', description: 'Get the current temperature in Celsius for a city.', schema: z.object({ city: z.string() }) },
);

const agent = createAgent({ model, tools: [getWeather] });
const out = await agent.invoke({
  messages: [{ role: 'user', content: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.' }],
});
for (const m of out.messages) {
  for (const c of m.tool_calls ?? []) console.log('tool-call', c.name, JSON.stringify(c.args));
  if (m.getType?.() === 'tool' || m._getType?.() === 'tool') console.log('tool-result', m.content);
}
const last = out.messages.at(-1);
console.log('reasoning field kept:', JSON.stringify(Object.keys(last.additional_kwargs ?? {})), JSON.stringify(Object.keys(last.response_metadata ?? {})));
console.log('content blocks:', JSON.stringify((last.contentBlocks ?? []).map((b) => b.type)));
console.log('answer:', last.text ?? last.content);
process.exitCode = /\b4\b|four/i.test(String(last.text ?? last.content)) ? 0 : 1;
