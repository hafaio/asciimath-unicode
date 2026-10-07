import { z } from "zod";
import type { Tone } from "../pkg/convert.js";
import { delimiterNames } from "./delimiters.ts";

/** name of an emoji skin tone */
export type SkinTone = keyof typeof Tone;

/** schema of the stored {@link Options} */
export const optionsSchema = z.object({
    pruneParens: z.boolean(),
    vulgarFractions: z.boolean(),
    scriptFractions: z.boolean(),
    keepSpaces: z.boolean(),
    spacedOperators: z.boolean(),
    skinTone: z.enum([
        "Default",
        "Light",
        "MediumLight",
        "Medium",
        "MediumDark",
        "Dark",
    ] satisfies readonly SkinTone[]),
    delimiter: z.enum(delimiterNames),
    wholeSite: z.boolean(),
});

/** everything a user can set */
export type Options = z.infer<typeof optionsSchema>;

/** the options of a fresh install */
export const defaultOptions: Options = {
    pruneParens: true,
    vulgarFractions: true,
    scriptFractions: true,
    keepSpaces: false,
    spacedOperators: false,
    skinTone: "Default",
    delimiter: "doubleDollar",
    wholeSite: false,
};

// delimiters that were once offered; a stored one means the default now
const removedDelimiters: readonly unknown[] = ["dollar"];

/**
 * parse stored options, using the default for each invalid one
 *
 * @returns the options, and the names of those that were invalid; a removed
 *   delimiter becomes the default without being listed
 */
export function parseOptions(stored: Record<string, unknown>): {
    options: Options;
    invalid: (keyof Options)[];
} {
    const current = removedDelimiters.includes(stored["delimiter"])
        ? { ...stored, delimiter: defaultOptions.delimiter }
        : stored;
    const invalid = optionsSchema
        .keyof()
        .options.filter(
            (key) => !optionsSchema.shape[key].safeParse(current[key]).success,
        );
    const options = optionsSchema.parse({
        ...defaultOptions,
        ...current,
        ...Object.fromEntries(invalid.map((key) => [key, defaultOptions[key]])),
    });
    return { options, invalid };
}

/** read the stored options, using the default for any invalid one */
export async function readOptions(): Promise<Options> {
    const stored =
        await chrome.storage.sync.get<Record<string, unknown>>(defaultOptions);
    const { options, invalid } = parseOptions(stored);
    if (invalid.length > 0) {
        console.error("invalid stored options; using defaults for", invalid);
    }
    return options;
}
