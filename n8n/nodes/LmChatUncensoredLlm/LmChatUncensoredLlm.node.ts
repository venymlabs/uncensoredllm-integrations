import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyModel } from '@n8n/ai-node-sdk';

type ModelOptions = {
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	reasoningMode?: 'extended' | 'fast';
	responseFormat?: 'text' | 'json_object';
	timeout?: number;
	maxRetries?: number;
};

// The model reasons before it answers. A budget under about 400 tokens can be spent on the
// reasoning alone, so the node never sends less than this.
const MIN_MAX_TOKENS = 512;

export class LmChatUncensoredLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UncensoredLLM Chat Model',
		name: 'lmChatUncensoredLlm',
		icon: { light: 'file:../../icons/uncensoredllm.svg', dark: 'file:../../icons/uncensoredllm.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["model"]}}',
		description: 'Use UncensoredLLM as the chat model of an AI Agent or chain',
		defaults: {
			name: 'UncensoredLLM Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [{ url: 'https://uncensoredllm.xyz/docs/integrations/n8n' }],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'uncensoredLlmApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [{ name: 'UncensoredLLM 1', value: 'uncensoredllm-1' }],
				default: 'uncensoredllm-1',
				description: 'The model that writes the reply',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
						description: 'How many times to retry a failed request',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 8192,
						typeOptions: { minValue: MIN_MAX_TOKENS, maxValue: 65536 },
						description:
							'Upper limit on the reply, reasoning included. Keep it at 512 or more: the model reasons before it answers.',
					},
					{
						displayName: 'Reasoning',
						name: 'reasoningMode',
						type: 'options',
						options: [
							{ name: 'Extended', value: 'extended', description: 'The default: the model reasons fully' },
							{ name: 'Fast', value: 'fast', description: 'Keeps the reasoning short' },
						],
						default: 'extended',
						description: 'How much the model reasons before it answers',
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						options: [
							{ name: 'Text', value: 'text' },
							{ name: 'JSON', value: 'json_object', description: 'The reply is a JSON object. Ask for JSON in the prompt too.' },
						],
						default: 'text',
						description: 'Whether the reply must be a JSON object',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 300000,
						description: 'Maximum time to wait for a reply, in milliseconds',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 2 },
						description: 'Nucleus sampling. Change this or the temperature, not both.',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('uncensoredLlmApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		const additionalParams: Record<string, unknown> = {};
		if (options.reasoningMode) additionalParams.reasoning_mode = options.reasoningMode;
		if (options.responseFormat === 'json_object') additionalParams.response_format = { type: 'json_object' };

		const maxTokens =
			options.maxTokens === undefined ? undefined : Math.max(MIN_MAX_TOKENS, options.maxTokens);

		return supplyModel(this, {
			type: 'openai',
			baseUrl: ((credentials.url as string) || 'https://uncensoredllm.xyz/v1').replace(/\/+$/, ''),
			apiKey: credentials.apiKey as string,
			model,
			temperature: options.temperature,
			topP: options.topP,
			maxTokens,
			timeout: options.timeout ?? 300000,
			maxRetries: options.maxRetries ?? 2,
			additionalParams,
		});
	}
}
