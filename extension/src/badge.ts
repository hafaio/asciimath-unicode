import { updateTabState } from "./tab-state.ts";

const errorColor = "#d93025";
const errorDurationMs = 5000;

const clearTimers = new Map<number, ReturnType<typeof setTimeout>>();

/** remove a tab's error badge and restore its usual tooltip */
export async function clearError(tabId: number): Promise<void> {
    if (!clearTimers.has(tabId)) {
        return;
    }
    clearTimeout(clearTimers.get(tabId));
    clearTimers.delete(tabId);
    await Promise.all([
        chrome.action.setBadgeText({ tabId }),
        updateTabState(tabId),
    ]);
}

/** show an error badge and tooltip on a tab's icon for a few seconds */
export async function showError(
    tabId: number,
    badge: string,
    title: string,
): Promise<void> {
    clearTimeout(clearTimers.get(tabId));
    clearTimers.set(
        tabId,
        setTimeout(() => {
            clearError(tabId).catch((err: unknown) => {
                // expected when the tab closed in the meantime
                console.debug("couldn't clear error badge", err);
            });
        }, errorDurationMs),
    );
    await Promise.all([
        chrome.action.setBadgeText({ tabId, text: badge }),
        chrome.action.setBadgeBackgroundColor({ tabId, color: errorColor }),
        chrome.action.setTitle({ tabId, title }),
    ]);
}
