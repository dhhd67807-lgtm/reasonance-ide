/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { localize } from '../../../../nls.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IChatAgentService, IChatAgentData, IChatAgentImplementation, IChatAgentRequest, IChatAgentHistoryEntry, IChatAgentResult } from '../common/participants/chatAgents.js';
import { IChatProgress } from '../common/chatService/chatService.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsService } from '../common/tools/languageModelToolsService.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';

export class DefaultChatAgent extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.defaultChatAgent';

	constructor(
		@IChatAgentService private readonly chatAgentService: IChatAgentService,
		@ILanguageModelsService private readonly languageModelsService: ILanguageModelsService,
		@ILanguageModelToolsService private readonly _toolsService: ILanguageModelToolsService,
	) {
		super();
		console.log('[DefaultChatAgent] CONSTRUCTOR CALLED - Agent is being initialized!'); // allow-any-unicode-next-line
		this.registerDefaultAgent();
		console.log('[DefaultChatAgent] Agent registered successfully'); // allow-any-unicode-next-line
	}

	private registerDefaultAgent(): void {
		const agentData: IChatAgentData = {
			id: 'chat',
			name: '', // Empty name so @ mention doesn't show
			description: localize('defaultAgent.description', 'AI assistant powered by iFlow'),
			extensionId: new ExtensionIdentifier('reasonance.chat'),
			extensionVersion: '1.0.0',
			extensionPublisherId: 'reasonance',
			publisherDisplayName: 'Reasonance',
			extensionDisplayName: 'Reasonance',
			fullName: 'Reasonance',
			isDefault: true,
			isCore: true,
			metadata: {
				isSticky: false, // Don't repopulate agent after each message
			},
			slashCommands: [],
			locations: [ChatAgentLocation.Chat, ChatAgentLocation.Terminal, ChatAgentLocation.Notebook, ChatAgentLocation.EditorInline],
			modes: [ChatModeKind.Ask, ChatModeKind.Edit, ChatModeKind.Agent],
			disambiguation: [],
		};

		const agentImpl: IChatAgentImplementation = {
			invoke: async (request: IChatAgentRequest, progress: (parts: IChatProgress[]) => void, history: IChatAgentHistoryEntry[], token: CancellationToken): Promise<IChatAgentResult> => {
				try {
					// Get the user's message
					const message = request.message;
					console.log('[DefaultChatAgent] Processing message:', message);

					// Get available language models
					const modelIds = await this.languageModelsService.selectLanguageModels({ vendor: 'iFlow' });
					console.log('[DefaultChatAgent] Found model IDs:', modelIds);

					if (modelIds.length === 0) {
						progress([{ kind: 'markdownContent', content: new MarkdownString('No language models available. Please check your iFlow configuration.') }]);
						return {};
					}

					const modelId = modelIds[0];
					console.log('[DefaultChatAgent] Using model ID:', modelId);
					const model = this.languageModelsService.lookupLanguageModel(modelId);
					console.log('[DefaultChatAgent] Model metadata:', model ? 'found' : 'NOT FOUND');
					if (model) {
						console.log('[DefaultChatAgent] Model details:', {
							id: model.id,
							vendor: model.vendor,
							name: model.name,
							capabilities: model.capabilities
						});
					}

					// Collect tools - always enable for now since we default to Agent mode
					const tools: any[] = [];
					console.log('[DefaultChatAgent] Getting tools from service...');
					const availableTools = Array.from(this._toolsService.getTools(model));
					console.log('[DefaultChatAgent] Available tools:', availableTools.length);
					
					for (const tool of availableTools) {
						console.log('[DefaultChatAgent] Adding tool:', tool.id, '-', tool.displayName);
						tools.push({
							type: 'function',
							function: {
								name: tool.id,
								description: tool.modelDescription,
								parameters: tool.inputSchema
							}
						});
					}
					console.log('[DefaultChatAgent] Total tools to send:', tools.length);
					if (tools.length > 0) {
						console.log('[DefaultChatAgent] First tool example:', JSON.stringify(tools[0], null, 2));
					}

					// Send request to language model with tools
					const response = await this.languageModelsService.sendChatRequest(
						modelId,
						new ExtensionIdentifier('reasonance.chat'),
						[{
							role: 1, // User role
							content: [{ type: 'text', value: message }]
						}],
						{ tools }, // Always pass tools object, even if empty
						token
					);

					// Stream the response
					for await (const part of response.stream) {
						if (token.isCancellationRequested) {
							break;
						}

						// Handle both single parts and arrays
						const parts = Array.isArray(part) ? part : [part];

						for (const p of parts) {
							if (p.type === 'text') {
								progress([{ kind: 'markdownContent', content: new MarkdownString(p.value) }]);
							}
						}
					}

					await response.result;

					return {};
				} catch (error) {
					progress([{ kind: 'markdownContent', content: new MarkdownString(`Error: ${error}`) }]);
					return { errorDetails: { message: String(error) } };
				}
			}
		};

		const agent = this.chatAgentService.registerDynamicAgent(agentData, agentImpl);
		this._store.add(agent);
	}
}
