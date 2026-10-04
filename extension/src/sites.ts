import type { PingAutosubMessage, StopAutosubMessage } from "./message";

const storageKey = "autosubSites";
const scriptIdPrefix = "autosub ";
const autosubScriptFile = "autosub.js";

function scriptId(site: string): string {
	return `${scriptIdPrefix}${site}`;
}

/** match patterns of the sites that convert as you type */
export async function enabledSites(): Promise<string[]> {
	const stored = await chrome.storage.local.get({ [storageKey]: [] });
	const sites: unknown = stored[storageKey];
	return Array.isArray(sites)
		? sites.filter((site): site is string => typeof site === "string")
		: [];
}

export async function isSiteEnabled(site: string): Promise<boolean> {
	const [sites, granted] = await Promise.all([
		enabledSites(),
		chrome.permissions.contains({ origins: [site] }),
	]);
	return granted && sites.includes(site);
}

function registration(site: string): chrome.scripting.RegisteredContentScript {
	return {
		id: scriptId(site),
		matches: [site],
		js: [autosubScriptFile],
		allFrames: true,
		runAt: "document_idle",
		persistAcrossSessions: true,
	};
}

/** make the registered content scripts match the stored sites */
export async function syncAutosubScripts(): Promise<void> {
	const [sites, registered] = await Promise.all([
		enabledSites(),
		chrome.scripting.getRegisteredContentScripts(),
	]);
	const registeredIds = new Set(
		registered
			.map(({ id }) => id)
			.filter((id) => id.startsWith(scriptIdPrefix)),
	);
	const wantedIds = new Set(sites.map(scriptId));
	const stale = [...registeredIds].filter((id) => !wantedIds.has(id));
	const missing = sites.filter((site) => !registeredIds.has(scriptId(site)));
	if (stale.length > 0) {
		await chrome.scripting.unregisterContentScripts({ ids: stale });
	}
	if (missing.length > 0) {
		await chrome.scripting.registerContentScripts(missing.map(registration));
	}
}

/**
 * Start converting as you type in a tab, until it navigates. Without host
 * access this reaches the frames that activeTab covers.
 */
export async function startInTab(tabId: number): Promise<void> {
	await chrome.scripting.executeScript({
		target: { tabId, allFrames: true },
		files: [autosubScriptFile],
	});
}

export async function stopInTab(tabId: number): Promise<void> {
	const message: StopAutosubMessage = { type: "stop-autosub" };
	try {
		await chrome.tabs.sendMessage(tabId, message);
	} catch {
		// nothing is listening in the tab
	}
}

/** whether a tab's page is converting as you type */
export async function isRunningInTab(tabId: number): Promise<boolean> {
	const message: PingAutosubMessage = { type: "ping-autosub" };
	try {
		// frames from other enabled sites say nothing about this page
		return (
			(await chrome.tabs.sendMessage(tabId, message, { frameId: 0 })) === true
		);
	} catch {
		return false;
	}
}

async function tabIdsOn(site: string): Promise<number[]> {
	const tabs = await chrome.tabs.query({ url: site });
	return tabs.flatMap(({ id }) => (id === undefined ? [] : [id]));
}

async function startInTabs(tabIds: Iterable<number>): Promise<void> {
	await Promise.all(
		[...tabIds].map(async (tabId) => {
			try {
				await startInTab(tabId);
			} catch (err) {
				console.error("couldn't start autosub in tab", tabId, err);
			}
		}),
	);
}

/** start converting in open tabs of enabled sites, which an update leaves off */
export async function startInEnabledSites(): Promise<void> {
	const sites = await enabledSites();
	const tabIds = await Promise.all(sites.map(tabIdsOn));
	await startInTabs(new Set(tabIds.flat()));
}

/**
 * Register the content script for a site and start it in the site's open
 * tabs, plus `currentTabId`, which activeTab reaches even before the host
 * permission is granted.
 */
export async function enableSite(
	site: string,
	currentTabId?: number,
): Promise<number[]> {
	const sites = await enabledSites();
	if (!sites.includes(site)) {
		await chrome.storage.local.set({ [storageKey]: [...sites, site] });
	}
	await syncAutosubScripts();
	const tabIds = new Set(await tabIdsOn(site));
	if (currentTabId !== undefined) {
		tabIds.add(currentTabId);
	}
	await startInTabs(tabIds);
	return [...tabIds];
}

/** stop converting as you type on a site; the host permission is kept */
export async function disableSite(site: string): Promise<number[]> {
	const sites = await enabledSites();
	await chrome.storage.local.set({
		[storageKey]: sites.filter((enabled) => enabled !== site),
	});
	await syncAutosubScripts();
	const tabIds = await tabIdsOn(site);
	await Promise.all(tabIds.map(stopInTab));
	return tabIds;
}

/** stop converting as you type on every site; host permissions are kept */
export async function disableAllSites(): Promise<number[]> {
	const sites = await enabledSites();
	await chrome.storage.local.set({ [storageKey]: [] });
	await syncAutosubScripts();
	const tabIds = [...new Set((await Promise.all(sites.map(tabIdsOn))).flat())];
	await Promise.all(tabIds.map(stopInTab));
	return tabIds;
}
