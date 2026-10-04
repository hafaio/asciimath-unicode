import { expect, test } from "bun:test";
import { defaultOptions, optionsSchema, parseOptions } from "./options";

test("options", () => {
	expect(optionsSchema.safeParse(null).success).toBeFalse();
	expect(
		optionsSchema.safeParse({ preserveWhitespace: false }).success,
	).toBeFalse();
	expect(optionsSchema.safeParse(defaultOptions).success).toBeTrue();
	expect(
		optionsSchema.safeParse({ ...defaultOptions, delimiter: "%" }).success,
	).toBeFalse();
});

test("stored options from the block era still parse", () => {
	const parsed = optionsSchema.safeParse({ ...defaultOptions, block: true });
	expect(parsed.success).toBeTrue();
	expect(parsed.data).toEqual(defaultOptions);
});

test("an invalid option falls back alone", () => {
	const { options, invalid } = parseOptions({
		...defaultOptions,
		pruneParens: false,
		delimiter: "%",
	});
	expect(invalid).toEqual(["delimiter"]);
	expect(options).toEqual({ ...defaultOptions, pruneParens: false });
});
