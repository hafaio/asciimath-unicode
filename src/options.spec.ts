import { expect, test } from "bun:test";
import { defaultOptions, optionsSchema } from "./options";

test("options", () => {
  expect(optionsSchema.guard(null)).toBeFalse();
  expect(optionsSchema.guard({ preserveWhitespace: false })).toBeFalse();
  expect(optionsSchema.guard(defaultOptions)).toBeTrue();
});
