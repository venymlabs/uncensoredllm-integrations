import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const DEFAULT_BASE_URL = 'https://uncensoredllm.xyz/v1';
const MIN_MAX_TOKENS = 512;

type MessageOptions = {
	systemMessage?: string;
	maxTokens?: number;
	temperature?: number;
	reasoningMode?: 'extended' | 'fast';
	jsonOutput?: boolean;
	includeReasoning?: boolean;
};

export class UncensoredLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UncensoredLLM',
		name: 'uncensoredLlm',
		icon: { light: 'file:../../icons/uncensoredllm.svg', dark: 'file:../../icons/uncensoredllm.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send a prompt to UncensoredLLM or read the account balance',
		defaults: {
			name: 'UncensoredLLM',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'uncensoredLlmApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message a Model',
						value: 'message',
						action: 'Message a model',
						description: 'Send a prompt and get the reply',
					},
					{
						name: 'Get Balance',
						value: 'balance',
						action: 'Get the account balance',
						description: 'Read the credit left on the account',
					},
				],
				default: 'message',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [{ name: 'UncensoredLLM 1', value: 'uncensoredllm-1' }],
				default: 'uncensoredllm-1',
				description: 'The model that writes the reply',
				displayOptions: { show: { operation: ['message'] } },
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				description: 'The message to send',
				displayOptions: { show: { operation: ['message'] } },
			},
			{
				displayName: 'Simplify Output',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description: 'Whether to return only the reply text and token usage instead of the full API response',
				displayOptions: { show: { operation: ['message'] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['message'] } },
				options: [
					{
						displayName: 'Include Reasoning',
						name: 'includeReasoning',
						type: 'boolean',
						default: false,
						description: 'Whether to add the model\'s reasoning to the simplified output',
					},
					{
						displayName: 'JSON Output',
						name: 'jsonOutput',
						type: 'boolean',
						default: false,
						description: 'Whether the reply must be a JSON object. Ask for JSON in the prompt too.',
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
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description: 'Controls randomness. Lower is more focused, higher is more varied.',
					},
					{
						displayName: 'System Message',
						name: 'systemMessage',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Instructions sent before the prompt',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('uncensoredLlmApi');
		const baseUrl = ((credentials.url as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');

		const call = async (method: IHttpRequestMethods, path: string, body?: IDataObject, itemIndex = 0) => {
			try {
				return (await this.helpers.httpRequestWithAuthentication.call(this, 'uncensoredLlmApi', {
					method,
					url: `${baseUrl}${path}`,
					body,
					json: true,
					timeout: 600000,
				})) as IDataObject;
			} catch (error) {
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'balance') {
					returnData.push({ json: await call('GET', '/balance', undefined, i), pairedItem: { item: i } });
					continue;
				}

				const model = this.getNodeParameter('model', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const simplify = this.getNodeParameter('simplify', i, true) as boolean;
				const options = this.getNodeParameter('options', i, {}) as MessageOptions;

				if (!prompt.trim()) {
					throw new NodeOperationError(this.getNode(), 'The prompt is empty', { itemIndex: i });
				}

				const messages: IDataObject[] = [];
				if (options.systemMessage) messages.push({ role: 'system', content: options.systemMessage });
				messages.push({ role: 'user', content: prompt });

				const body: IDataObject = { model, messages };
				if (options.maxTokens !== undefined) body.max_tokens = Math.max(MIN_MAX_TOKENS, options.maxTokens);
				if (options.temperature !== undefined) body.temperature = options.temperature;
				if (options.reasoningMode) body.reasoning_mode = options.reasoningMode;
				if (options.jsonOutput) body.response_format = { type: 'json_object' };

				const response = await call('POST', '/chat/completions', body, i);

				if (!simplify) {
					returnData.push({ json: response, pairedItem: { item: i } });
					continue;
				}

				const choice = ((response.choices as IDataObject[]) ?? [])[0] ?? {};
				const message = (choice.message as IDataObject) ?? {};
				const out: IDataObject = {
					text: message.content ?? '',
					finish_reason: choice.finish_reason ?? null,
					usage: response.usage ?? null,
				};
				if (options.includeReasoning) out.reasoning = message.reasoning_content ?? null;
				returnData.push({ json: out, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// NodeOperationError passes an existing NodeOperationError through and keeps the
				// messages and description of a NodeApiError.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
