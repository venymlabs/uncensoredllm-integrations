import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { askUncensoredllm } from './lib/actions/ask-uncensoredllm';
import { getBalance } from './lib/actions/get-balance';
import { uncensoredllmAuth } from './lib/auth';

// No "Custom API Call" action: the generic one in @activepieces/pieces-common sends through an
// HTTP client that turns off TLS certificate checks for the process (see lib/common.ts).
export const uncensoredllm = createPiece({
  displayName: 'UncensoredLLM',
  description: 'One uncensored LLM, served from our own GPUs, through an OpenAI-compatible API.',
  auth: uncensoredllmAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://uncensoredllm.xyz/icon-512.png',
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
  authors: ['uncensoredllm'],
  actions: [askUncensoredllm, getBalance],
  triggers: [],
});
