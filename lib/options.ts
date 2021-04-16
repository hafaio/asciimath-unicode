import { isRecord } from "./utils";

export const defaultOptions = {
  preserveWhitespace: true,
  pruneParens: true,
  vulgarFractions: true,
  fractionSlash: true,
  convertFractions: true,
};

export type Options = typeof defaultOptions;

/** obj is Options */
export function isOptions(obj: unknown): obj is Options {
  if (!isRecord(obj)) return false;
  for (const [key, val] of Object.entries(defaultOptions)) {
    if (typeof val !== typeof obj[key]) return false;
  }
  return true;
}
