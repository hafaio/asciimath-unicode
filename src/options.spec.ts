import { expect, test } from "bun:test";
import { defaultOptions, isOptions } from "./options";

test("options", () => {
  expect(isOptions(null)).toBeFalsy();
  expect(isOptions({ preserveWhitespace: false })).toBeFalsy();
  expect(isOptions(defaultOptions)).toBeTruthy();
});
