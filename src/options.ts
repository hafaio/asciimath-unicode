import { CompiledSchema, boolean, enumeration, properties } from "jtd-ts";
import { Tone } from "../pkg/convert";

export type SkinTone = keyof typeof Tone;

export interface Options {
  pruneParens: boolean;
  vulgarFractions: boolean;
  scriptFractions: boolean;
  skinTone: SkinTone;
}

export const defaultOptions: Options = {
  pruneParens: true,
  vulgarFractions: true,
  scriptFractions: true,
  skinTone: "Default",
};

export const optionsSchema = properties({
  pruneParens: boolean(),
  vulgarFractions: boolean(),
  scriptFractions: boolean(),
  skinTone: enumeration(
    "Default",
    "Light",
    "MediumLight",
    "Medium",
    "MediumDark",
    "Dark",
  ),
}) satisfies CompiledSchema<Options, unknown>;
