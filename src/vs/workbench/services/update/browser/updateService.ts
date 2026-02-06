/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from '../../../../base/common/event.js';
import { IUpdateService, State, UpdateType } from '../../../../platform/update/common/update.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IHostService } from '../../host/browser/host.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { GitHubUpdateProvider } from './githubUpdateProvider.js';

export interface IUpdate {
	version: string;
}

export interface IUpdateProvider {

	/**
	 * Should return with the `IUpdate` object if an update is
	 * available or `null` otherwise to signal that there are
	 * no updates.
	 */
	checkForUpdate(): Promise<IUpdate | null>;
}

export class BrowserUpdateService extends Disposable implements IUpdateService {

	declare readonly _serviceBrand: undefined;

	private _onStateChange = this._register(new Emitter<State>());
	readonly onStateChange: Event<State> = this._onStateChange.event;

	private _state: State = State.Uninitialized;
	get state(): State { return this._state; }
	set state(state: State) {
		this._state = state;
		this._onStateChange.fire(state);
	}

	private readonly githubUpdateProvider: GitHubUpdateProvider | undefined;

	constructor(
		@IBrowserWorkbenchEnvironmentService private readonly environmentService: IBrowserWorkbenchEnvironmentService,
		@IHostService private readonly hostService: IHostService,
		@IProductService private readonly productService: IProductService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		// Initialize GitHub update provider if updateUrl is configured
		if (this.productService.updateUrl) {
			this.githubUpdateProvider = new GitHubUpdateProvider(this.productService, this.logService);
			this.logService.info('[BrowserUpdateService] GitHub update provider initialized');
		}

		this.checkForUpdates(false);
	}

	async isLatestVersion(): Promise<boolean | undefined> {
		const update = await this.doCheckForUpdates(false);
		if (update === undefined) {
			return undefined; // no update provider
		}

		return !!update;
	}

	async checkForUpdates(explicit: boolean): Promise<void> {
		await this.doCheckForUpdates(explicit);
	}

	private async doCheckForUpdates(explicit: boolean): Promise<IUpdate | null /* no update available */ | undefined /* no update provider */> {
		// First try the GitHub update provider
		if (this.githubUpdateProvider) {
			this.logService.info('[BrowserUpdateService] Using GitHub update provider');

			// State -> Checking for Updates
			this.state = State.CheckingForUpdates(explicit);

			const update = await this.githubUpdateProvider.checkForUpdate();
			if (update) {
				// State -> Downloaded
				this.state = State.Ready({ version: update.version, productVersion: update.version }, explicit, false);
				this.logService.info('[BrowserUpdateService] Update available:', update.version);
			} else {
				// State -> Idle
				this.state = State.Idle(UpdateType.Archive);
				this.logService.info('[BrowserUpdateService] No update available');
			}

			return update;
		}

		// Fallback to environment update provider
		if (this.environmentService.options && this.environmentService.options.updateProvider) {
			const updateProvider = this.environmentService.options.updateProvider;

			// State -> Checking for Updates
			this.state = State.CheckingForUpdates(explicit);

			const update = await updateProvider.checkForUpdate();
			if (update) {
				// State -> Downloaded
				this.state = State.Ready({ version: update.version, productVersion: update.version }, explicit, false);
			} else {
				// State -> Idle
				this.state = State.Idle(UpdateType.Archive);
			}

			return update;
		}

		return undefined; // no update provider to ask
	}

	async downloadUpdate(): Promise<void> {
		// no-op
	}

	async applyUpdate(): Promise<void> {
		// Open the download page in a new window
		const downloadUrl = this.productService.downloadUrl;
		if (downloadUrl) {
			this.logService.info('[BrowserUpdateService] Opening download page:', downloadUrl);
			window.open(downloadUrl, '_blank');
		} else {
			// Fallback to reload
			this.hostService.reload();
		}
	}

	async quitAndInstall(): Promise<void> {
		this.hostService.reload();
	}

	async _applySpecificUpdate(packagePath: string): Promise<void> {
		// noop
	}

	async disableProgressiveReleases(): Promise<void> {
		// noop - not applicable in browser
	}
}

registerSingleton(IUpdateService, BrowserUpdateService, InstantiationType.Eager);
