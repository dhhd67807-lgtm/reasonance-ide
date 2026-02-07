/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from '../../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../../common/contributions.js';
import { ILanguageModelToolsService } from '../languageModelToolsService.js';
import { ConfirmationTool, ConfirmationToolData } from './confirmationTool.js';
import { EditTool, EditToolData } from './editFileTool.js';
import { createManageTodoListToolData, ManageTodoListTool } from './manageTodoListTool.js';
import { RunSubagentTool } from './runSubagentTool.js';
import {
	CodebaseSearchTool, CodebaseSearchToolData,
	ReadFileTool, ReadFileToolData,
	ListDirTool, ListDirToolData,
	GrepSearchTool, GrepSearchToolData,
	FileSearchTool, FileSearchToolData
} from './reasonanceTools.js';

export class BuiltinToolsContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'chat.builtinTools';

	constructor(
		@ILanguageModelToolsService toolsService: ILanguageModelToolsService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		const editTool = instantiationService.createInstance(EditTool);
		this._register(toolsService.registerTool(EditToolData, editTool));

		const todoToolData = createManageTodoListToolData();
		const manageTodoListTool = this._register(instantiationService.createInstance(ManageTodoListTool));
		this._register(toolsService.registerTool(todoToolData, manageTodoListTool));

		// Register the confirmation tool
		const confirmationTool = instantiationService.createInstance(ConfirmationTool);
		this._register(toolsService.registerTool(ConfirmationToolData, confirmationTool));

		// Register Reasonance AI tools
		const codebaseSearchTool = instantiationService.createInstance(CodebaseSearchTool);
		this._register(toolsService.registerTool(CodebaseSearchToolData, codebaseSearchTool));
		this._register(toolsService.agentToolSet.addTool(CodebaseSearchToolData));

		const readFileTool = instantiationService.createInstance(ReadFileTool);
		this._register(toolsService.registerTool(ReadFileToolData, readFileTool));
		this._register(toolsService.readToolSet.addTool(ReadFileToolData));

		const listDirTool = instantiationService.createInstance(ListDirTool);
		this._register(toolsService.registerTool(ListDirToolData, listDirTool));
		this._register(toolsService.readToolSet.addTool(ListDirToolData));

		const grepSearchTool = instantiationService.createInstance(GrepSearchTool);
		this._register(toolsService.registerTool(GrepSearchToolData, grepSearchTool));
		this._register(toolsService.readToolSet.addTool(GrepSearchToolData));

		const fileSearchTool = instantiationService.createInstance(FileSearchTool);
		this._register(toolsService.registerTool(FileSearchToolData, fileSearchTool));
		this._register(toolsService.readToolSet.addTool(FileSearchToolData));

		const runSubagentTool = this._register(instantiationService.createInstance(RunSubagentTool));

		let runSubagentRegistration: IDisposable | undefined;
		let toolSetRegistration: IDisposable | undefined;
		const registerRunSubagentTool = () => {
			runSubagentRegistration?.dispose();
			toolSetRegistration?.dispose();
			toolsService.flushToolUpdates();
			const runSubagentToolData = runSubagentTool.getToolData();
			runSubagentRegistration = toolsService.registerTool(runSubagentToolData, runSubagentTool);
			toolSetRegistration = toolsService.agentToolSet.addTool(runSubagentToolData);
		};
		registerRunSubagentTool();
		this._register(runSubagentTool.onDidUpdateToolData(registerRunSubagentTool));
		this._register({
			dispose: () => {
				runSubagentRegistration?.dispose();
				toolSetRegistration?.dispose();
			}
		});


	}
}

export const InternalFetchWebPageToolId = 'vscode_fetchWebPage_internal';
