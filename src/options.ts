import { JtdSchema, check } from "./validate";

export interface Options {
  preserveWhitespace: boolean;
  pruneParens: boolean;
  vulgarFractions: boolean;
  fractionSlash: boolean;
  convertFractions: boolean;
}

export const defaultOptions: Options = {
  preserveWhitespace: true,
  pruneParens: true,
  vulgarFractions: true,
  fractionSlash: true,
  convertFractions: true,
};

const optionsSchema: JtdSchema<Options> = {
  properties: {
    preserveWhitespace: { type: "boolean" },
    pruneParens: { type: "boolean" },
    vulgarFractions: { type: "boolean" },
    fractionSlash: { type: "boolean" },
    convertFractions: { type: "boolean" },
  },
};

export function isOptions(obj: unknown): obj is Options {
  return check(optionsSchema, obj);
}
