export const toggleCommand = "ascii-math-unicode";

/** the assigned shortcut, or undefined when Chrome dropped it over a conflict */
export async function currentShortcut(): Promise<string | undefined> {
	const commands = await chrome.commands.getAll();
	const shortcut = commands.find(
		({ name }) => name === toggleCommand,
	)?.shortcut;
	return shortcut || undefined;
}

/**
 * The keys of a shortcut as Chrome reports it: "Alt+Shift+U" elsewhere,
 * or symbols without separators, like "⌥⇧U", on Mac.
 */
export function shortcutKeys(shortcut: string): string[] {
	if (shortcut.includes("+")) {
		return shortcut.split("+");
	} else {
		const [, modifiers = "", key = ""] =
			/^([⌃⌥⇧⌘]*)(.*)$/u.exec(shortcut) ?? [];
		return [...Array.from(modifiers), ...(key ? [key] : [])];
	}
}

export async function openShortcutSettings(): Promise<void> {
	await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}
