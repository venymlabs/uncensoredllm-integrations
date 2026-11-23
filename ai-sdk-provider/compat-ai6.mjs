// Does the v4 provider load under ai 6.x? Expected: no (ai 6 implements specification v3).
import { uncensoredllm } from '@uncensoredllm/ai-sdk-provider';
import { generateText } from 'ai';

try {
  const r = await generateText({ model: uncensoredllm(), prompt: 'Reply with the single word: ready', maxRetries: 0 });
  console.log('ai 6 accepted the v4 model; answer:', r.text);
} catch (e) {
  console.log('ai 6 rejected the v4 model:', e?.name, '-', String(e?.message).slice(0, 300));
  process.exitCode = 2;
}
