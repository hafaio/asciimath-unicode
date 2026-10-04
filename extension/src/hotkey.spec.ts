import { expect, test } from "bun:test";
import { shortcutKeys } from "./hotkey.ts";

test("separated keys", () => {
    expect(shortcutKeys("Alt+Shift+U")).toEqual(["Alt", "Shift", "U"]);
});

test("mac symbols", () => {
    expect(shortcutKeys("⌃⇧U")).toEqual(["⌃", "⇧", "U"]);
});

test("mac symbols with a named key", () => {
    expect(shortcutKeys("⌥⇧F2")).toEqual(["⌥", "⇧", "F2"]);
    expect(shortcutKeys("⌘Space")).toEqual(["⌘", "Space"]);
});
