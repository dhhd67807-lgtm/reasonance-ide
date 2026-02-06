/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IUpdate, IUpdateProvider } from './updateService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ILogService } from '../../../../platform/log/common/log.js';

interface IGitHubRelease {
	tag_name: string;
	name: string;
	html_url: string;
	assets: Array<{
		name: string;
		browser_download_url: string;
	}>;
}

export class GitHubUpdateProvider implements IUpdateProvider {

	constructor(
		@IProductService private readonly productService: IProductService,
		@ILogService private readonly logService: ILogService
	) { }

	async checkForUpdate(): Promise<IUpdate | null> {
		const updateUrl = this.productService.updateUrl;
		if (!updateUrl) {
			this.logService.info('[GitHubUpdateProvider] No updateUrl configured');
			return null;
		}

		try {
			this.logService.info('[GitHubUpdateProvider] Checking for updates at:', updateUrl);

			const response = await fetch(updateUrl, {
				headers: {
					'Accept': 'application/vnd.github.v3+json',
					'User-Agent': 'Reasonance-IDE'
				}
			});

			if (!response.ok) {
				this.logService.error('[GitHubUpdateProvider] Failed to fetch release info:', response.status, response.statusText);
				return null;
			}

			const release: IGitHubRelease = await response.json();
			this.logService.info('[GitHubUpdateProvider] Latest release:', release.tag_name);

			// Extract version from tag (e.g., "v1.110.0" -> "1.110.0")
			const latestVersion = release.tag_name.replace(/^v/, '');
			const currentVersion = this.productService.version;

			this.logService.info('[GitHubUpdateProvider] Current version:', currentVersion, 'Latest version:', latestVersion);

			// Compare versions
			if (this.isNewerVersion(latestVersion, currentVersion)) {
				this.logService.info('[GitHubUpdateProvider] Update available:', latestVersion);
				return {
					version: latestVersion
				};
			}

			this.logService.info('[GitHubUpdateProvider] Already on latest version');
			return null;

		} catch (error) {
			this.logService.error('[GitHubUpdateProvider] Error checking for updates:', error);
			return null;
		}
	}

	private isNewerVersion(latest: string, current: string): boolean {
		const latestParts = latest.split('.').map(Number);
		const currentParts = current.split('.').map(Number);

		for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
			const latestPart = latestParts[i] || 0;
			const currentPart = currentParts[i] || 0;

			if (latestPart > currentPart) {
				return true;
			}
			if (latestPart < currentPart) {
				return false;
			}
		}

		return false;
	}
}
