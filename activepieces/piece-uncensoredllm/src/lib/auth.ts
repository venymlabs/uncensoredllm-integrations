import { PieceAuth } from '@activepieces/pieces-framework';
import { callApi } from './common';

export const uncensoredllmAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description: `Your UncensoredLLM API key. It starts with vk-.

1. Open https://uncensoredllm.xyz and sign in.
2. Create a key on the API keys page and paste it here.`,
  // GET /balance needs a valid key and costs nothing.
  validate: async ({ auth }) => {
    try {
      await callApi(auth, 'GET', '/balance');
      return { valid: true };
    } catch (e) {
      return { valid: false, error: (e as Error).message || 'The API key was not accepted.' };
    }
  },
});
