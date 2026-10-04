import { convert, default as init, Tone } from "../pkg/convert.js";
import { clearError, showError } from "./badge.ts";
import { copy } from "./copy.ts";
import { toggleCommand } from "./hotkey.ts";
import { messageSchema, type Response } from "./message.ts";
import { optionsSchema, readOptions } from "./options.ts";
import { sitePattern } from "./site-patterns.ts";
import {
    disableAllSites,
    disableSite,
    enableSite,
    isRunningInTab,
    isSiteEnabled,
    startInEnabledSites,
    startInTab,
    stopInTab,
    syncAutosubScripts,
} from "./sites.ts";
import { updateAllTabStates, updateTabState } from "./tab-state.ts";

/** run background work whose failure only matters in the console */
function quietly(work: Promise<unknown>, what: string): void {
    work.catch((err: unknown) => {
        console.debug(what, err);
    });
}

// Changes to which sites and tabs are on, run one at a time so quick
// repeated clicks see each other's result.
let queue: Promise<unknown> = Promise.resolve();
function inTurn<Result>(work: () => Promise<Result>): Promise<Result> {
    const turn = queue.then(work);
    queue = turn.catch(() => undefined);
    return turn;
}

const initialize = init({
    // biome-ignore lint/style/useNamingConvention: the name wasm-bindgen gives it
    module_or_path: chrome.runtime.getURL("convert_bg.wasm"),
});

// add callback for rendering through wasm
chrome.runtime.onMessage.addListener(
    (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        send: (resp: Response) => void,
    ): boolean => {
        const tabId = sender.tab?.id;
        const parsed = messageSchema.safeParse(message);
        if (parsed.success) {
            const { text } = parsed.data;
            Promise.all([readOptions(), initialize]).then(
                ([
                    { vulgarFractions, scriptFractions, skinTone, pruneParens },
                ]) => {
                    let result: string;
                    try {
                        result = convert(
                            text,
                            pruneParens,
                            vulgarFractions,
                            scriptFractions,
                            Tone[skinTone],
                        );
                    } catch (err) {
                        console.error(err);
                        send({ type: "error", err: "conversion error" });
                        if (tabId !== undefined) {
                            quietly(
                                showError(
                                    tabId,
                                    copy.errorBadge,
                                    copy.errorConversion,
                                ),
                                "couldn't show error",
                            );
                        }
                        return;
                    }
                    send({ type: "result", result });
                    if (tabId !== undefined) {
                        quietly(clearError(tabId), "couldn't clear error");
                    }
                },
                (err: unknown) => {
                    console.error(err);
                    send({
                        type: "error",
                        err: "initialization or storage error",
                    });
                    if (tabId !== undefined) {
                        quietly(
                            showError(
                                tabId,
                                copy.errorBadge,
                                copy.errorConversion,
                            ),
                            "couldn't show error",
                        );
                    }
                },
            );
        } else {
            send({ type: "error", err: "invalid message format" });
        }
        return true;
    },
);

// Granted sites, kept in memory because permissions.request only counts as
// a response to the click if nothing is awaited before it. Undefined until
// loaded, e.g. when the click itself woke the worker.
let grantedSites: Set<string> | undefined;
void chrome.permissions.getAll().then(({ origins = [] }) => {
    grantedSites = new Set(origins);
});
chrome.permissions.onAdded.addListener(({ origins = [] }) => {
    for (const origin of origins) {
        grantedSites?.add(origin);
    }
});
chrome.permissions.onRemoved.addListener(({ origins = [] }) => {
    for (const origin of origins) {
        grantedSites?.delete(origin);
    }
    quietly(updateAllTabStates(), "couldn't update tabs");
});

// Whether turning on stays on for the site, kept in memory for the same
// reason. Undefined until loaded.
let wholeSite: boolean | undefined;
void readOptions().then((options) => {
    ({ wholeSite } = options);
});
chrome.storage.onChanged.addListener((changes, area) => {
    const parsed = optionsSchema.shape.wholeSite.safeParse(
        changes["wholeSite"]?.newValue,
    );
    if (area === "sync" && parsed.success) {
        wholeSite = parsed.data;
        if (!wholeSite) {
            quietly(
                inTurn(disableAllSites).then((tabIds) =>
                    Promise.all(tabIds.map((id) => refreshTab(id))),
                ),
                "couldn't turn sites off",
            );
        }
    }
});

// Tabs whose page was turned on, kept in memory so turning one off never
// asks for access, and in session storage for when the worker restarts.
// Undefined until loaded.
const pageTabsKey = "pageTabs";
let pageTabs: Set<number> | undefined;
void chrome.storage.session.get({ [pageTabsKey]: [] }).then((stored) => {
    const ids: unknown = stored[pageTabsKey];
    pageTabs = new Set(
        Array.isArray(ids)
            ? ids.filter((id): id is number => typeof id === "number")
            : [],
    );
});

function markPageTab(tabId: number, on: boolean): void {
    if (pageTabs !== undefined && pageTabs.has(tabId) !== on) {
        if (on) {
            pageTabs.add(tabId);
        } else {
            pageTabs.delete(tabId);
        }
        void chrome.storage.session.set({ [pageTabsKey]: [...pageTabs] });
    }
}

chrome.tabs.onRemoved.addListener((tabId) => {
    markPageTab(tabId, false);
});

/**
 * Turn converting as you type on or off for the tab: for its site when
 * `forSite` resolves true, otherwise for its page until it navigates.
 */
async function toggle(
    tabId: number,
    site: string,
    forSite: Promise<boolean>,
): Promise<void> {
    let tabIds: number[] = [];
    if (await isSiteEnabled(site)) {
        tabIds = await disableSite(site);
    } else if (await isRunningInTab(tabId)) {
        await stopInTab(tabId);
    } else if (await forSite) {
        tabIds = await enableSite(site, tabId);
    } else {
        await startInTab(tabId);
    }
    await Promise.all(
        [...new Set([tabId, ...tabIds])].map((id) => refreshTab(id)),
    );
}

/**
 * Whether to turn on the whole site when the click woke the worker. Asking
 * for access may no longer count as answering the click; if Chrome refuses,
 * only the page turns on.
 */
async function forSiteAfterWaking(
    tabId: number,
    site: string,
): Promise<boolean> {
    const [options, access, running] = await Promise.all([
        readOptions(),
        chrome.permissions.contains({ origins: [site] }),
        isRunningInTab(tabId),
    ]);
    if (!options.wholeSite || running) {
        return false;
    } else if (access) {
        return true;
    } else {
        try {
            return await chrome.permissions.request({ origins: [site] });
        } catch {
            return false;
        }
    }
}

function refreshTab(tabId: number, url?: string): Promise<void> {
    return updateTabState(tabId, url).then(
        (pageOn) => {
            markPageTab(tabId, pageOn);
        },
        (err: unknown) => {
            // expected when the tab closed in the meantime
            console.debug("couldn't update tab", tabId, err);
        },
    );
}

// the icon and the hotkey turn converting as you type on or off
function toggleTab(tab: chrome.tabs.Tab | undefined): void {
    const tabId = tab?.id;
    const site = sitePattern(tab?.url);
    if (tabId === undefined) {
        console.error("no tab to toggle");
    } else if (site === undefined) {
        quietly(
            showError(tabId, copy.errorBadge, copy.errorSiteUnsupported),
            "couldn't show error",
        );
    } else {
        let forSite: Promise<boolean>;
        if (wholeSite === undefined || pageTabs === undefined) {
            forSite = forSiteAfterWaking(tabId, site);
        } else if (!wholeSite || pageTabs.has(tabId)) {
            forSite = Promise.resolve(false);
        } else if (grantedSites?.has(site) === true) {
            forSite = Promise.resolve(true);
        } else {
            // only prompts when access is missing, so a cold cache is safe;
            // turning access down turns on just the page
            forSite = chrome.permissions.request({ origins: [site] });
        }
        inTurn(() => toggle(tabId, site, forSite)).catch((err: unknown) => {
            console.error("couldn't toggle tab", err);
            quietly(
                showError(tabId, copy.errorBadge, copy.errorRestrictedPage),
                "couldn't show error",
            );
        });
    }
}

chrome.action.onClicked.addListener(toggleTab);

chrome.commands.onCommand.addListener((command, tab) => {
    if (command === toggleCommand) {
        toggleTab(tab);
    } else {
        console.error("unknown command");
    }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
    void refreshTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, { status, url }, tab) => {
    if (status !== undefined || url !== undefined) {
        void refreshTab(tabId, tab.url);
    }
});

/** `updated` when the extension was just installed or updated */
function restoreState(updated: boolean): void {
    quietly(
        chrome.action.setTitle({ title: copy.actionEnable }),
        "couldn't set title",
    );
    quietly(
        inTurn(async () => {
            const options = await readOptions();
            if (!options.wholeSite) {
                await disableAllSites();
            } else if (updated) {
                await syncAutosubScripts();
                await startInEnabledSites();
            } else {
                await syncAutosubScripts();
            }
        }).then(updateAllTabStates),
        "couldn't restore state",
    );
}

chrome.runtime.onStartup.addListener(() => {
    restoreState(false);
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
    restoreState(true);
    if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
        quietly(chrome.runtime.openOptionsPage(), "couldn't open options");
    }
});
