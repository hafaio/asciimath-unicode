import { copy } from "./copy";
import { sitePattern } from "./site-patterns";
import { isRunningInTab, isSiteEnabled } from "./sites";

const sizes = [16, 32] as const;

function iconPaths(suffix: string): Record<string, string> {
	return Object.fromEntries(
		sizes.map((size) => [String(size), `/images/am${suffix}${size}.png`]),
	);
}

const enabledIcon = iconPaths("");
const disabledIcon = iconPaths("-grey");

function title(siteOn: boolean, pageOn: boolean): string {
	if (siteOn) {
		return copy.actionDisableSite;
	} else if (pageOn) {
		return copy.actionDisable;
	} else {
		return copy.actionEnable;
	}
}

/**
 * Show whether the tab converts as you type. Tabs on sites without host
 * access have no visible URL, so only a running page shows as on. Resolves
 * whether the page is converting.
 */
export async function updateTabState(
	tabId: number,
	url?: string,
): Promise<boolean> {
	const tabUrl = url ?? (await chrome.tabs.get(tabId)).url;
	const site = sitePattern(tabUrl);
	const [siteOn, pageOn] = await Promise.all([
		site !== undefined && isSiteEnabled(site),
		isRunningInTab(tabId),
	]);
	const enabled = siteOn || pageOn;
	await Promise.all([
		chrome.action.setIcon({
			tabId,
			path: enabled ? enabledIcon : disabledIcon,
		}),
		chrome.action.setTitle({ tabId, title: title(siteOn, pageOn) }),
	]);
	return pageOn;
}

export async function updateAllTabStates(): Promise<void> {
	const tabs = await chrome.tabs.query({});
	await Promise.all(
		tabs.map(async ({ id, url }) => {
			if (id !== undefined) {
				await updateTabState(id, url).catch((err: unknown) => {
					// expected when the tab closed in the meantime
					console.debug("couldn't update tab", id, err);
				});
			}
		}),
	);
}
