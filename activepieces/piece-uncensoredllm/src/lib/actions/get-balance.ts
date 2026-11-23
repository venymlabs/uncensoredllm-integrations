import { createAction } from '@activepieces/pieces-framework';
import { uncensoredllmAuth } from '../auth';
import { callApi } from '../common';

export const getBalance = createAction({
  auth: uncensoredllmAuth,
  name: 'get_balance',
  displayName: 'Get Balance',
  description: 'Read the credit left on the account.',
  audience: 'both',
  aiMetadata: {
    description: 'Returns the UncensoredLLM account balance in US dollars, the plan, and what this key has spent. Read-only.',
    idempotent: true,
  },
  props: {},
  async run({ auth }) {
    return await callApi(auth.secret_text, 'GET', '/balance');
  },
});
