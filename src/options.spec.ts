import { expect, test } from "bun:test";
import { defaultOptions, optionsSchema } from "./options";

test("options", () => {
	expect(optionsSchema.safeParse(null).success).toBeFalse();
	expect(
		optionsSchema.safeParse({ preserveWhitespace: false }).success,
	).toBeFalse();
	expect(optionsSchema.safeParse(defaultOptions).success).toBeTrue();
});

test("stored options from the block era still parse", () => {
	const parsed = optionsSchema.safeParse({ ...defaultOptions, block: true });
	expect(parsed.success).toBeTrue();
	expect(parsed.data).toEqual(defaultOptions);
});
