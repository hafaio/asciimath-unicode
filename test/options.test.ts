import { defaultOptions, isOptions } from "../lib/options";

test("options", () => {
  expect(isOptions(null)).toBeFalsy();
  expect(isOptions({ preserveWhitespace: false })).toBeFalsy();
  expect(isOptions(defaultOptions)).toBeTruthy();
});
