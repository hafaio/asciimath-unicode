import { currentShortcut, shortcutKeys } from "./hotkey.ts";
import { convert } from "./message.ts";

type OutputOption =
    | "pruneParens"
    | "vulgarFractions"
    | "scriptFractions"
    | "keepSpaces"
    | "spacedOperators";

/** each output switch, paired with math whose conversion shows what it changes */
export const outputSwitches: [OutputOption, string][] = [
    ["pruneParens", "x^(2n)"],
    ["vulgarFractions", "1/2"],
    ["scriptFractions", "(x+1)/(x-1)"],
    ["keepSpaces", "a + b"],
    ["spacedOperators", "a+b=c"],
];

/** track the shortcut as keys: null when none is set, undefined until known */
export function useShortcut(): { readonly keys: string[] | null | undefined } {
    let keys = $state<string[] | null | undefined>();
    $effect(() => {
        if (!globalThis.chrome?.commands) {
            return;
        }
        function refresh(): void {
            void currentShortcut().then((shortcut) => {
                keys = shortcut === undefined ? null : shortcutKeys(shortcut);
            });
        }
        // the shortcut is changed in another tab, so recheck on return
        function onVisible(): void {
            if (document.visibilityState === "visible") {
                refresh();
            }
        }
        refresh();
        document.addEventListener("visibilitychange", onVisible);
        return (): void => {
            document.removeEventListener("visibilitychange", onVisible);
        };
    });
    return {
        get keys(): string[] | null | undefined {
            return keys;
        },
    };
}

/**
 * convert each output switch's example with the stored options
 *
 * @param saves - how many times the options have been stored; the examples
 *   convert again whenever it changes, and not at all while it is 0
 * @returns the conversions so far, keyed by the example's math
 */
export function useExamples(saves: () => number): {
    readonly converted: Record<string, string>;
} {
    let converted = $state.raw<Record<string, string>>({});
    $effect(() => {
        if (saves() === 0 || !globalThis.chrome?.runtime?.id) {
            return;
        }
        let current = true;
        void Promise.all(
            outputSwitches.map(async ([, math]) => [math, await convert(math)]),
        ).then(
            (pairs) => {
                if (current) {
                    converted = Object.fromEntries(pairs);
                }
            },
            (err: unknown) => {
                console.error("couldn't convert examples", err);
            },
        );
        return (): void => {
            current = false;
        };
    });
    return {
        get converted(): Record<string, string> {
            return converted;
        },
    };
}
