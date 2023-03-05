import { JtdSchema, check } from "./validate";
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

const optionsSchema: JtdSchema<Options> = {
  properties: {
    pruneParens: { type: "boolean" },
    vulgarFractions: { type: "boolean" },
    scriptFractions: { type: "boolean" },
    skinTone: {
      enum: ["Default", "Light", "MediumLight", "Medium", "MediumDark", "Dark"],
    },
  },
};

export function isOptions(obj: unknown): obj is Options {
  return check(optionsSchema, obj);
}
