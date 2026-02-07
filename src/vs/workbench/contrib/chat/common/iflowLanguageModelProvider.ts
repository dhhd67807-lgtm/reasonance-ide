/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import {
	IChatMessage,
	IChatResponsePart,
	ILanguageModelChatMetadata,
	ILanguageModelChatMetadataAndIdentifier,
	ILanguageModelChatProvider,
	ILanguageModelChatResponse,
	ILanguageModelChatInfoOptions,
	ChatMessageRole,
	IChatMessagePart
} from './languageModels.js';

const IFLOW_API_BASE_URL = 'https://apis.iflow.cn/v1';
const IFLOW_API_KEY_STORAGE_KEY = 'iflow.apiKey';
const IFLOW_DEFAULT_MODEL = 'qwen3-max';
const IFLOW_VENDOR = 'iFlow';
const IFLOW_EXTENSION_ID = 'reasonance.iflow';

interface IFlowChatCompletionRequest {
	model: string;
	messages: Array<{
		role: string;
		content: string | Array<{ type: string; text?: string; image_url?: any }>;
	}>;
	stream: boolean;
	temperature?: number;
	max_tokens?: number;
	tools?: any[];
	tool_choice?: string | { type: string; function: { name: string } };
}

interface IFlowChatCompletionChunk {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		delta: {
			role?: string;
			content?: string;
			tool_calls?: Array<{
				index: number;
				id: string;
				type: string;
				function: {
					name: string;
					arguments: string;
				};
			}>;
		};
		finish_reason: string | null;
	}>;
}

export class IFlowLanguageModelProvider extends Disposable implements ILanguageModelChatProvider {
	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange = this._onDidChange.event;

	private _apiKey: string | undefined;
	private readonly _modelId = `${IFLOW_VENDOR}/${IFLOW_DEFAULT_MODEL}`;

	constructor(
		@IRequestService private readonly requestService: IRequestService,
		@ILogService private readonly logService: ILogService,
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService
	) {
		super();
		this._loadApiKey();
	}

	private async _loadApiKey(): Promise<void> {
		try {
			this._apiKey = await this.secretStorageService.get(IFLOW_API_KEY_STORAGE_KEY);

			// Force update to new API key
			const newKey = 'sk-37b97ac5509f031ffa465c2f5ba0f662';
			if (this._apiKey !== newKey) {
				this.logService.info('[iFlow] Updating API key to new one');
				this._apiKey = newKey;
				await this.secretStorageService.set(IFLOW_API_KEY_STORAGE_KEY, this._apiKey);
			}

			if (!this._apiKey) {
				// Use default API key for now
				this._apiKey = 'sk-37b97ac5509f031ffa465c2f5ba0f662';
				await this.secretStorageService.set(IFLOW_API_KEY_STORAGE_KEY, this._apiKey);
			}
		} catch (error) {
			this.logService.error('Failed to load iFlow API key:', error);
		}
	}

	async setApiKey(apiKey: string): Promise<void> {
		this._apiKey = apiKey;
		await this.secretStorageService.set(IFLOW_API_KEY_STORAGE_KEY, apiKey);
		this._onDidChange.fire();
	}

	getApiKey(): string | undefined {
		return this._apiKey;
	}

	// ILanguageModelChatProvider implementation
	async provideLanguageModelChatInfo(
		options: ILanguageModelChatInfoOptions,
		token: CancellationToken
	): Promise<ILanguageModelChatMetadataAndIdentifier[]> {
		if (!this._apiKey) {
			return [];
		}

		return [{
			identifier: this._modelId,
			metadata: this._getMetadata()
		}];
	}

	async sendChatRequest(
		modelId: string,
		messages: IChatMessage[],
		from: ExtensionIdentifier,
		options: { [name: string]: unknown },
		token: CancellationToken
	): Promise<ILanguageModelChatResponse> {
		this.logService.info('[iFlow] sendChatRequest called with modelId:', modelId);
		this.logService.info('[iFlow] messages:', JSON.stringify(messages));

		if (!this._apiKey) {
			this.logService.error('[iFlow] API key not configured!');
			throw new Error('iFlow API key not configured');
		}

		this.logService.info('[iFlow] Using API key:', this._apiKey.substring(0, 10) + '...');

		const model = (options.model as string) || IFLOW_DEFAULT_MODEL;
		this.logService.info('[iFlow] Using model:', model);

		// Convert VS Code messages to iFlow format
		const iflowMessages = messages.map(msg => ({
			role: this._convertRole(msg.role),
			content: this._convertContent(msg.content)
		}));

		const requestBody: IFlowChatCompletionRequest = {
			model,
			messages: iflowMessages,
			stream: true,
			temperature: options.temperature as number | undefined,
			max_tokens: (options.maxTokens as number | undefined) || 32768, // Use full potential if not specified
		};

		// Add tools if provided
		this.logService.info('[iFlow] Checking for tools in options:', Object.keys(options));
		this.logService.info('[iFlow] options.tools:', options.tools);
		if (options.tools && Array.isArray(options.tools) && options.tools.length > 0) {
			requestBody.tools = options.tools;
			// Enable auto tool calling
			requestBody.tool_choice = 'auto';
			this.logService.info('[iFlow] Tools enabled:', options.tools.length, 'tools');
		} else {
			this.logService.info('[iFlow] No tools provided in options');
		}

		this.logService.info('[iFlow] Request body:', JSON.stringify(requestBody, null, 2));

		this.logService.info('[iFlow] Making request to:', `${IFLOW_API_BASE_URL}/chat/completions`);

		const response = await this.requestService.request({
			type: 'POST',
			url: `${IFLOW_API_BASE_URL}/chat/completions`,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this._apiKey}`
			},
			data: JSON.stringify(requestBody),
			timeout: 60000
		}, token);

		this.logService.info('[iFlow] Response status:', response.res.statusCode);

		if (response.res.statusCode !== 200) {
			const errorText = await asJson(response);
			throw new Error(`iFlow API error: ${response.res.statusCode} - ${JSON.stringify(errorText)}`);
		}

		// Consume the stream and parse it
		const stream = this._parseStreamingResponse(response.stream, token);

		return {
			stream,
			result: Promise.resolve({})
		};
	}

	async provideTokenCount(
		modelId: string,
		message: string | IChatMessage,
		token: CancellationToken
	): Promise<number> {
		// Rough estimation: 1 token approximately equals 4 characters // allow-any-unicode-next-line
		if (typeof message === 'string') {
			return Math.ceil(message.length / 4);
		}

		let totalLength = 0;
		for (const part of message.content) {
			if (part.type === 'text') {
				totalLength += part.value.length;
			}
		}
		return Math.ceil(totalLength / 4);
	}

	private _convertRole(role: ChatMessageRole): string {
		switch (role) {
			case ChatMessageRole.System:
				return 'system';
			case ChatMessageRole.User:
				return 'user';
			case ChatMessageRole.Assistant:
				return 'assistant';
			default:
				return 'user';
		}
	}

	private _convertContent(parts: IChatMessagePart[]): string | any[] {
		if (parts.length === 1 && parts[0].type === 'text') {
			return parts[0].value;
		}

		// Handle multi-part messages (text + images)
		return parts.map(part => {
			if (part.type === 'text') {
				return { type: 'text', text: part.value };
			} else if (part.type === 'image_url') {
				// Convert VSBuffer to base64 string
				let base64Data: string;
				const data = part.value.data;

				// VSBuffer has a buffer property that is a Uint8Array
				if (data && typeof data.toString === 'function') {
					// Try using VSBuffer's toString method if available
					const str = data.toString();
					base64Data = Buffer.from(str, 'binary').toString('base64');
				} else if (data && data.buffer) {
					// Access the underlying buffer
					const uint8Array = new Uint8Array(data.buffer);
					base64Data = Buffer.from(uint8Array).toString('base64');
				} else {
					// Fallback
					this.logService.warn('[iFlow] Unknown image data format');
					base64Data = '';
				}

				return {
					type: 'image_url',
					image_url: {
						url: `data:${part.value.mimeType};base64,${base64Data}`
					}
				};
			}
			return { type: 'text', text: '' };
		});
	}

	private async *_parseStreamingResponse(
		stream: any,
		token: CancellationToken
	): AsyncIterable<IChatResponsePart> {
		this.logService.info('[iFlow] Starting to parse streaming response');

		let buffer = '';

		try {
			// Check if it's a WriteableStreamImpl (VS Code internal stream)
			if (stream && stream.constructor && stream.constructor.name === 'WriteableStreamImpl') {
				this.logService.info('[iFlow] Detected WriteableStreamImpl, streaming in real-time');

				let buffer = '';
				const dataQueue: string[] = [];
				let streamEnded = false;
				let streamError: any = null;

				stream.on('data', (chunk: any) => {
					let chunkStr = '';
					if (ArrayBuffer.isView(chunk)) {
						chunkStr = new TextDecoder('utf-8').decode(chunk);
					} else if (typeof chunk === 'string') {
						chunkStr = chunk;
					} else if (chunk && chunk.toString && chunk.constructor.name !== 'Object') {
						chunkStr = chunk.toString();
					}

					buffer += chunkStr;

					// Split by \n\n to get complete SSE messages
					const lines = buffer.split('\n\n');
					buffer = lines.pop() || ''; // Keep incomplete message

					// Add complete messages to queue
					dataQueue.push(...lines.filter(l => l.trim()));
				});

				stream.on('end', () => {
					streamEnded = true;
					if (buffer.trim()) {
						dataQueue.push(buffer);
					}
				});

				stream.on('error', (err: any) => {
					streamError = err;
					streamEnded = true;
				});

				// Yield messages as they arrive
				while (!streamEnded || dataQueue.length > 0) {
					if (token.isCancellationRequested) {
						break;
					}

					if (dataQueue.length > 0) {
						const line = dataQueue.shift()!;
						if (line.startsWith('data:')) {
							const data = line.slice(5).trim();
							if (data !== '[DONE]') {
								try {
									const parsed: IFlowChatCompletionChunk = JSON.parse(data);
									for (const choice of parsed.choices) {
										if (choice.delta?.content) {
											yield { type: 'text', value: choice.delta.content };
										}
										if (choice.delta?.tool_calls) {
											for (const toolCall of choice.delta.tool_calls) {
												yield {
													type: 'tool_use',
													name: toolCall.function.name,
													toolCallId: toolCall.id,
													parameters: JSON.parse(toolCall.function.arguments || '{}')
												};
											}
										}
									}
								} catch (e) {
									this.logService.error('[iFlow] Parse error:', e);
								}
							}
						}
					} else if (!streamEnded) {
						// Wait for more data
						await new Promise(resolve => setTimeout(resolve, 10));
					}

					if (streamError) throw streamError;
				}

			} else if (stream && typeof stream.read === 'function') {
				// Handle Node.js stream
				stream.on('data', (chunk: any) => {
					buffer += chunk.toString();
				});

				await new Promise<void>((resolve, reject) => {
					stream.on('end', resolve);
					stream.on('error', reject);
				});

				// Process the complete buffer
				yield* this._processBuffer(buffer, token);
			} else {
				// Fallback: try to consume as async iterable or convert to string
				this.logService.info('[iFlow] Stream type:', typeof stream);

				// Try to read the stream as chunks
				const chunks: any[] = [];

				if (stream[Symbol.asyncIterator]) {
					for await (const chunk of stream) {
						if (token.isCancellationRequested) break;
						chunks.push(chunk);
					}
				} else {
					// Last resort: try to read synchronously
					this.logService.warn('[iFlow] Stream is not async iterable, attempting synchronous read');
					chunks.push(stream);
				}

				// Convert chunks to string
				for (const chunk of chunks) {
					this.logService.info('[iFlow] Chunk type:', typeof chunk, 'constructor:', chunk?.constructor?.name);

					if (ArrayBuffer.isView(chunk)) {
						// It's a typed array (Uint8Array, etc.)
						buffer += new TextDecoder('utf-8').decode(chunk);
					} else if (chunk && chunk.buffer instanceof ArrayBuffer) {
						// It's a VSBuffer or similar with ArrayBuffer
						buffer += new TextDecoder('utf-8').decode(chunk.buffer);
					} else if (typeof chunk === 'string') {
						buffer += chunk;
					} else if (chunk && typeof chunk.toString === 'function' && chunk.constructor.name !== 'Object') {
						// Only call toString if it's not a plain Object (avoid [object Object])
						buffer += chunk.toString();
					} else {
						this.logService.error('[iFlow] Cannot convert chunk, trying JSON.stringify');
						// The stream object itself - this shouldn't happen but log it
						this.logService.error('[iFlow] Stream object keys:', Object.keys(chunk || {}));
					}
				}

				// Process the complete buffer
				yield* this._processBuffer(buffer, token);
			}
		} catch (error) {
			this.logService.error('[iFlow] Error in streaming:', error);
			throw error;
		}

		this.logService.info('[iFlow] Streaming complete');
	}

	private *_processBuffer(buffer: string, token: CancellationToken): Iterable<IChatResponsePart> {
		this.logService.info('[iFlow] Processing buffer, length:', buffer.length);
		this.logService.info('[iFlow] Buffer preview:', buffer.substring(0, 500));

		// Process complete lines (ending with \n\n)
		const lines = buffer.split('\n\n');
		this.logService.info('[iFlow] Split into', lines.length, 'lines');

		let yieldedCount = 0;
		for (const line of lines) {
			if (token.isCancellationRequested) {
				break;
			}

			if (!line.trim() || !line.startsWith('data:')) {
				continue;
			}

			const data = line.slice(5).trim();

			if (data === '[DONE]') {
				this.logService.info('[iFlow] Stream complete marker found');
				continue;
			}

			try {
				const parsed: IFlowChatCompletionChunk = JSON.parse(data);

				for (const choice of parsed.choices) {
					// Yield text content
					if (choice.delta && choice.delta.content !== undefined && choice.delta.content !== '') {
						this.logService.info('[iFlow] Yielding text content:', choice.delta.content.substring(0, 50));
						yieldedCount++;
						yield {
							type: 'text',
							value: choice.delta.content
						};
					}

					// Handle tool calls
					if (choice.delta && choice.delta.tool_calls) {
						for (const toolCall of choice.delta.tool_calls) {
							this.logService.info('[iFlow] Tool call received:', toolCall.function.name);
							yieldedCount++;
							yield {
								type: 'tool_use',
								name: toolCall.function.name,
								toolCallId: toolCall.id,
								parameters: JSON.parse(toolCall.function.arguments || '{}')
							};
						}
					}
				}
			} catch (error) {
				this.logService.error('[iFlow] Failed to parse chunk:', data.substring(0, 100), error);
			}
		}

		this.logService.info('[iFlow] Total items yielded:', yieldedCount);
	}

	private _getMetadata(): ILanguageModelChatMetadata {
		return {
			extension: new ExtensionIdentifier(IFLOW_EXTENSION_ID),
			id: this._modelId,
			vendor: IFLOW_VENDOR,
			name: IFLOW_DEFAULT_MODEL,
			version: '1.0',
			family: 'TBStars',
			maxInputTokens: 200000,
			maxOutputTokens: 32768, // Increased from 8192 to full potential
			isDefaultForLocation: {
				panel: true,
				terminal: true,
				notebook: true,
				editor: true
			},
			isUserSelectable: true,
			modelPickerCategory: {
				label: 'iFlow AI',
				order: 1
			},
			auth: {
				providerLabel: 'iFlow AI',
				accountLabel: 'API Key'
			},
			capabilities: {
				vision: true,
				toolCalling: true,
				agentMode: true
			}
		};
	}
}
