/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { ISearchService, QueryType, ITextQuery, IFileMatch, ITextSearchMatch, ExcludeGlobPattern } from '../../../../../services/search/common/search.js';
import { CountTokensCallback, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolDataSource, ToolProgress } from '../languageModelToolsService.js';
import * as glob from '../../../../../../base/common/glob.js';

// Tool IDs
export const CodebaseSearchToolId = 'reasonance_codebase_search';
export const ReadFileToolId = 'reasonance_read_file';
export const ListDirToolId = 'reasonance_list_dir';
export const GrepSearchToolId = 'reasonance_grep_search';
export const FileSearchToolId = 'reasonance_file_search';

// Tool Data Definitions
export const CodebaseSearchToolData: IToolData = {
	id: CodebaseSearchToolId,
	displayName: 'Codebase Search',
	modelDescription: 'Find snippets of code from the codebase most relevant to the search query. This is a semantic search tool.',
	source: ToolDataSource.Internal,
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'The search query to find relevant code. You should reuse the user\'s exact query/most recent message with their wording unless there is a clear reason not to.'
			},
			target_directories: {
				type: 'array',
				items: { type: 'string' },
				description: 'Glob patterns for directories to search over'
			},
			explanation: {
				type: 'string',
				description: 'One sentence explanation as to why this tool is being used, and how it contributes to the goal.'
			}
		},
		required: ['query']
	}
};

export const ReadFileToolData: IToolData = {
	id: ReadFileToolId,
	displayName: 'Read File',
	modelDescription: 'Read the contents of a file with optional line range specification.',
	source: ToolDataSource.Internal,
	inputSchema: {
		type: 'object',
		properties: {
			target_file: {
				type: 'string',
				description: 'The path of the file to read. You can use either a relative path in the workspace or an absolute path.'
			},
			should_read_entire_file: {
				type: 'boolean',
				description: 'Whether to read the entire file. Defaults to false.'
			},
			start_line_one_indexed: {
				type: 'integer',
				description: 'The one-indexed line number to start reading from (inclusive).'
			},
			end_line_one_indexed_inclusive: {
				type: 'integer',
				description: 'The one-indexed line number to end reading at (inclusive).'
			},
			explanation: {
				type: 'string',
				description: 'One sentence explanation as to why this tool is being used.'
			}
		},
		required: ['target_file', 'should_read_entire_file', 'start_line_one_indexed', 'end_line_one_indexed_inclusive']
	}
};

export const ListDirToolData: IToolData = {
	id: ListDirToolId,
	displayName: 'List Directory',
	modelDescription: 'List the contents of a directory. Useful for discovery and understanding file structure.',
	source: ToolDataSource.Internal,
	inputSchema: {
		type: 'object',
		properties: {
			relative_workspace_path: {
				type: 'string',
				description: 'Path to list contents of, relative to the workspace root.'
			},
			explanation: {
				type: 'string',
				description: 'One sentence explanation as to why this tool is being used.'
			}
		},
		required: ['relative_workspace_path']
	}
};

export const GrepSearchToolData: IToolData = {
	id: GrepSearchToolId,
	displayName: 'Grep Search',
	modelDescription: 'Fast, exact regex searches over text files using ripgrep. Best for finding exact text matches or regex patterns.',
	source: ToolDataSource.Internal,
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'The regex pattern to search for'
			},
			case_sensitive: {
				type: 'boolean',
				description: 'Whether the search should be case sensitive'
			},
			include_pattern: {
				type: 'string',
				description: 'Glob pattern for files to include (e.g. \'*.ts\' for TypeScript files)'
			},
			exclude_pattern: {
				type: 'string',
				description: 'Glob pattern for files to exclude'
			},
			explanation: {
				type: 'string',
				description: 'One sentence explanation as to why this tool is being used.'
			}
		},
		required: ['query']
	}
};

export const FileSearchToolData: IToolData = {
	id: FileSearchToolId,
	displayName: 'File Search',
	modelDescription: 'Fast file search based on fuzzy matching against file path.',
	source: ToolDataSource.Internal,
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Fuzzy filename to search for'
			},
			explanation: {
				type: 'string',
				description: 'One sentence explanation as to why this tool is being used.'
			}
		},
		required: ['query', 'explanation']
	}
};

// Tool Implementations

export class CodebaseSearchTool implements IToolImpl {
	constructor(
		@ISearchService private readonly searchService: ISearchService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) { }

	async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult> {
		const params = invocation.parameters as { query: string; target_directories?: string[]; explanation?: string };
		
		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		const query: ITextQuery = {
			type: QueryType.Text,
			contentPattern: {
				pattern: params.query,
				isRegExp: false,
				isCaseSensitive: false,
				isWordMatch: false
			},
			folderQueries: [{
				folder: workspaceFolder.uri
			}],
			maxResults: 50
		};

		const results = await this.searchService.textSearch(query, token);
		
		const matches = results.results.slice(0, 20).map((result: IFileMatch) => {
			const firstMatch = result.results?.[0];
			if (firstMatch && 'previewText' in firstMatch) {
				const textMatch = firstMatch as ITextSearchMatch;
				return `File: ${result.resource.fsPath}\n${textMatch.previewText}`;
			}
			return `File: ${result.resource.fsPath}`;
		}).join('\n\n');

		return {
			content: [{ kind: 'text', value: matches || 'No results found' }]
		};
	}
}

export class ReadFileTool implements IToolImpl {
	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) { }

	async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult> {
		const params = invocation.parameters as {
			target_file: string;
			should_read_entire_file: boolean;
			start_line_one_indexed: number;
			end_line_one_indexed_inclusive: number;
		};

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		const fileUri = params.target_file.startsWith('/') || params.target_file.includes(':')
			? URI.file(params.target_file)
			: URI.joinPath(workspaceFolder.uri, params.target_file);

		const content = await this.fileService.readFile(fileUri);
		const text = content.value.toString();
		const lines = text.split('\n');

		if (params.should_read_entire_file) {
			return {
				content: [{ kind: 'text', value: text }]
			};
		}

		const startLine = Math.max(0, params.start_line_one_indexed - 1);
		const endLine = Math.min(lines.length, params.end_line_one_indexed_inclusive);
		const selectedLines = lines.slice(startLine, endLine).join('\n');

		const summary = `Lines ${params.start_line_one_indexed}-${params.end_line_one_indexed_inclusive} of ${lines.length} total lines:\n\n${selectedLines}`;

		return {
			content: [{ kind: 'text', value: summary }]
		};
	}
}

export class ListDirTool implements IToolImpl {
	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) { }

	async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, _token: CancellationToken): Promise<IToolResult> {
		const params = invocation.parameters as { relative_workspace_path: string };

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		const dirUri = URI.joinPath(workspaceFolder.uri, params.relative_workspace_path);

		const stat = await this.fileService.resolve(dirUri);
		
		if (!stat.children) {
			throw new Error('Not a directory');
		}

		const listing = stat.children.map(child => {
			const type = child.isDirectory ? '[DIR]' : '[FILE]';
			return `${type} ${child.name}`;
		}).join('\n');

		return {
			content: [{ kind: 'text', value: listing }]
		};
	}
}

export class GrepSearchTool implements IToolImpl {
	constructor(
		@ISearchService private readonly searchService: ISearchService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) { }

	async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult> {
		const params = invocation.parameters as {
			query: string;
			case_sensitive?: boolean;
			include_pattern?: string;
			exclude_pattern?: string;
		};

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		// Convert string patterns to proper types
		const includePattern: glob.IExpression | undefined = params.include_pattern 
			? { [params.include_pattern]: true }
			: undefined;

		const excludePattern: ExcludeGlobPattern[] | undefined = params.exclude_pattern
			? [{ pattern: { [params.exclude_pattern]: true } }]
			: undefined;

		const query: ITextQuery = {
			type: QueryType.Text,
			contentPattern: {
				pattern: params.query,
				isRegExp: true,
				isCaseSensitive: params.case_sensitive || false,
				isWordMatch: false
			},
			folderQueries: [{
				folder: workspaceFolder.uri,
				includePattern,
				excludePattern
			}],
			maxResults: 50
		};

		const results = await this.searchService.textSearch(query, token);
		
		const matches = results.results.slice(0, 50).map((result: IFileMatch) => {
			const fileMatches = result.results?.map((match) => {
				if ('previewText' in match) {
					const textMatch = match as ITextSearchMatch;
					const range = textMatch.rangeLocations[0]?.source;
					const lineNum = range ? range.startLineNumber : '?';
					return `Line ${lineNum}: ${textMatch.previewText}`;
				}
				return '';
			}).filter(Boolean).join('\n') || '';
			return `${result.resource.fsPath}:\n${fileMatches}`;
		}).join('\n\n');

		return {
			content: [{ kind: 'text', value: matches || 'No matches found' }]
		};
	}
}

export class FileSearchTool implements IToolImpl {
	constructor(
		@ISearchService private readonly searchService: ISearchService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) { }

	async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult> {
		const params = invocation.parameters as { query: string };

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		const query = {
			type: QueryType.File,
			filePattern: params.query,
			folderQueries: [{
				folder: workspaceFolder.uri
			}],
			maxResults: 10
		};

		const results = await this.searchService.fileSearch(query as any, token);
		
		const files = results.results.slice(0, 10).map((result: any) => result.resource.fsPath).join('\n');

		return {
			content: [{ kind: 'text', value: files || 'No files found' }]
		};
	}
}
