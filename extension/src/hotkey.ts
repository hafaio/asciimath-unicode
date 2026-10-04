/** name of the manifest command that turns converting on or off */
export const toggleCommand = "ascii-math-unicode";

/** the assigned shortcut, or undefined when Chrome dropped it over a conflict */
export async function currentShortcut(): Promise<string | undefined> {
    const commands = await chrome.commands.getAll();
    const shortcut = commands.find(
        ({ name }) => name === toggleCommand,
    )?.shortcut;
    return shortcut || undefined;
}

const symbolShortcut = /^(?<modifiers>[⌃⌥⇧⌘]*)(?<key>.*)$/u;

/**
 * split a shortcut as Chrome reports it into its keys
 *
 * Chrome reports symbols without separators on Mac, like "⌥⇧U", and names
 * joined by plus signs elsewhere, like "Alt+Shift+U".
 */
export function shortcutKeys(shortcut: string): string[] {
    if (shortcut.includes("+")) {
        return shortcut.split("+");
    } else {
        const { modifiers = "", key = "" } =
            symbolShortcut.exec(shortcut)?.groups ?? {};
        return [...Array.from(modifiers), ...(key ? [key] : [])];
    }
}

/** open Chrome's page for changing extension shortcuts */
export async function openShortcutSettings(): Promise<void> {
    await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}
