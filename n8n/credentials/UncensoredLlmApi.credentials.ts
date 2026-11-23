import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class UncensoredLlmApi implements ICredentialType {
	name = 'uncensoredLlmApi';

	displayName = 'UncensoredLLM API';

	documentationUrl = 'https://uncensoredllm.xyz/docs/integrations/n8n';

	icon: Icon = { light: 'file:../icons/uncensoredllm.svg', dark: 'file:../icons/uncensoredllm.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your UncensoredLLM key. It starts with vk-.',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: 'https://uncensoredllm.xyz/v1',
			description: 'Leave as it is unless you were given another address',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// GET /balance needs a valid key and costs nothing.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/balance',
			method: 'GET',
		},
	};
}
