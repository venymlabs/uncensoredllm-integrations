// Smallest LangGraph.js graph on UncensoredLLM: model node -> tool node -> model node.
// npm install @langchain/langgraph @langchain/core @langchain/openai zod ; export UNCENSOREDLLM_API_KEY=vk-...
import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const getWeather = tool(
  async ({ city }) => JSON.stringify({ city, celsius: city.toLowerCase().includes('oslo') ? 4 : 21, sky: 'clear' }),
  { name: 'get_weather', description: 'Get the current temperature in Celsius for a city.', schema: z.object({ city: z.string() }) },
);

const llm = new ChatOpenAI({
  model: 'uncensoredllm-1',
  apiKey: process.env.UNCENSOREDLLM_API_KEY,
  configuration: { baseURL: 'https://uncensoredllm.xyz/v1' },
  streaming: true,
  streamUsage: true,
  maxRetries: 0,
}).bindTools([getWeather]);

const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent', async (state) => ({ messages: [await llm.invoke(state.messages)] }))
  .addNode('tools', new ToolNode([getWeather]))
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', (s) => (s.messages.at(-1).tool_calls?.length ? 'tools' : END))
  .addEdge('tools', 'agent')
  .compile();

const out = await graph.invoke({ messages: [{ role: 'user', content: 'What is the temperature in Oslo right now? Use the tool, then answer in one short sentence.' }] });
for (const m of out.messages) for (const c of m.tool_calls ?? []) console.log('tool-call', c.name, JSON.stringify(c.args));
const last = out.messages.at(-1);
console.log('usage:', JSON.stringify(last.usage_metadata));
console.log('answer:', last.text ?? last.content);
process.exitCode = /\b4\b|four/i.test(String(last.text ?? last.content)) ? 0 : 1;
