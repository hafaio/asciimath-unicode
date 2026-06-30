import { z } from "zod";
import type { Tone } from "../pkg/convert";

export type SkinTone = keyof typeof Tone;

export const optionsSchema = z.object({
	pruneParens: z.boolean(),
	vulgarFractions: z.boolean(),
	scriptFractions: z.boolean(),
	block: z.boolean(),
	skinTone: z.enum([
		"Default",
		"Light",
		"MediumLight",
		"Medium",
		"MediumDark",
		"Dark",
	] satisfies readonly SkinTone[]),
});

export type Options = z.infer<typeof optionsSchema>;

export const defaultOptions: Options = {
	pruneParens: true,
	vulgarFractions: true,
	scriptFractions: true,
	block: false,
	skinTone: "Default",
};
