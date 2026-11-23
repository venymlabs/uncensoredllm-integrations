// Incompatibility check: VoltAgent 2.x (ai 6) given the v4 provider from @uncensoredllm/ai-sdk-provider.
import { Agent } from '@voltagent/core';
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider';

const agent = new Agent({ name: 'probe', instructions: 'Be brief.', model: uncensoredllm('uncensoredllm-1') });
try {
  const res = await agent.generateText('Reply with the single word: ready');
  console.log('accepted; answer:', res.text);
  process.exit(0);
} catch (e) {
  console.log('rejected:', e?.name, '-', String(e?.message).slice(0, 300));
  process.exit(2);
}
