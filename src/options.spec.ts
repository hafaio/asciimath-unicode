import { defaultOptions, isOptions } from "./options";
import { test, expect } from "bun:test";

test("options", () => {
  expect(isOptions(null)).toBeFalsy();
  expect(isOptions({ preserveWhitespace: false })).toBeFalsy();
  expect(isOptions(defaultOptions)).toBeTruthy();
});
