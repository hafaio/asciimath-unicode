import { z } from "zod";
import type { Tone } from "../pkg/convert";
import { delimiterNames } from "./delimiters";

export type SkinTone = keyof typeof Tone;

export const optionsSchema = z.object({
	pruneParens: z.boolean(),
	vulgarFractions: z.boolean(),
	scriptFractions: z.boolean(),
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

export type Options = z.infer<typeof optionsSchema>;

export const defaultOptions: Options = {
	pruneParens: true,
	vulgarFractions: true,
	scriptFractions: true,
	skinTone: "Default",
	delimiter: "doubleDollar",
	wholeSite: false,
};

/**
 * Stored options, with the default for each invalid one. `invalid` lists
 * the options that were replaced.
 */
export function parseOptions(stored: Record<string, unknown>): {
	options: Options;
	invalid: (keyof Options)[];
} {
	const keys = Object.keys(defaultOptions) as (keyof Options)[];
	const invalid = keys.filter(
		(key) => !optionsSchema.shape[key].safeParse(stored[key]).success,
	);
	const options = optionsSchema.parse({
		...defaultOptions,
		...stored,
		...Object.fromEntries(invalid.map((key) => [key, defaultOptions[key]])),
	});
	return { options, invalid };
}

/** stored options, falling back to the default for any invalid one */
export async function readOptions(): Promise<Options> {
	const stored = await chrome.storage.sync.get(
		defaultOptions as unknown as Record<string, unknown>,
	);
	const { options, invalid } = parseOptions(stored);
	if (invalid.length > 0) {
		console.error("invalid stored options; using defaults for", invalid);
	}
	return options;
}
