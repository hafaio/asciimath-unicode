import { expect, test } from "bun:test";
import { defaultOptions, optionsSchema } from "./options";

test("options", () => {
	expect(optionsSchema.safeParse(null).success).toBeFalse();
	expect(
		optionsSchema.safeParse({ preserveWhitespace: false }).success,
	).toBeFalse();
	expect(optionsSchema.safeParse(defaultOptions).success).toBeTrue();
});

test("old options format missing block is rejected", () => {
	const { block: _, ...oldFormat } = defaultOptions;
	expect(optionsSchema.safeParse(oldFormat).success).toBeFalse();
});
