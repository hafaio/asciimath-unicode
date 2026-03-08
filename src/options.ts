import { boolean, type CompiledSchema, enumeration, properties } from "jtd-ts";
import type { Tone } from "../pkg/convert";

export type SkinTone = keyof typeof Tone;

export interface Options {
	pruneParens: boolean;
	vulgarFractions: boolean;
	scriptFractions: boolean;
	block: boolean;
	skinTone: SkinTone;
}

export const defaultOptions: Options = {
	pruneParens: true,
	vulgarFractions: true,
	scriptFractions: true,
	block: false,
	skinTone: "Default",
};

export const optionsSchema = properties({
	pruneParens: boolean(),
	vulgarFractions: boolean(),
	scriptFractions: boolean(),
	block: boolean(),
	skinTone: enumeration(
		"Default",
		"Light",
		"MediumLight",
		"Medium",
		"MediumDark",
		"Dark",
	),
}) satisfies CompiledSchema<Options, unknown>;
