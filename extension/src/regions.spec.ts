import { describe, expect, test } from "bun:test";
import { completedSpans, mapPosition, replaceSpans, textEdit } from "./regions";

test("replaceSpans", () => {
	const text = "0 $x$ and $y$ 9";
	const spans = [
		{ start: 2, end: 5, content: "x" },
		{ start: 10, end: 13, content: "y" },
	];
	expect(replaceSpans(text, 1, 14, spans, ["X", "Y"])).toBe(" X and Y ");
});

describe("mapPosition", () => {
	// "$$a$$ x $$bb$$ y"
	const spans = [
		{ start: 0, end: 5, content: "a" },
		{ start: 8, end: 14, content: "bb" },
	];
	const replacements = ["A", "B"];

	test("before, between, and after spans", () => {
		expect(mapPosition(0, spans, replacements)).toBe(0);
		expect(mapPosition(6, spans, replacements)).toBe(2);
		expect(mapPosition(16, spans, replacements)).toBe(7);
	});

	test("inside a span moves to the end of its replacement", () => {
		expect(mapPosition(10, spans, replacements)).toBe(5);
	});
});

describe("textEdit", () => {
	test("typing", () => {
		expect(textEdit("ab", "aXb")).toEqual({ start: 1, end: 2, removed: 0 });
	});

	test("replacing a selection", () => {
		expect(textEdit("a123b", "aXb")).toEqual({ start: 1, end: 2, removed: 3 });
	});

	test("deleting", () => {
		expect(textEdit("abc", "ac")).toEqual({ start: 1, end: 1, removed: 1 });
	});
});

describe("completedSpans", () => {
	function completed(
		before: string,
		after: string,
		delimiter: Parameters<typeof completedSpans>[3] = "doubleDollar",
		kind: "typed" | "inserted" = "typed",
	): string[] {
		return completedSpans(
			before,
			after,
			textEdit(before, after),
			delimiter,
			kind,
		).map(({ content }) => content);
	}

	test("typing the closing marker", () => {
		expect(completed("so $$x^2$", "so $$x^2$$")).toEqual(["x^2"]);
	});

	test("typing a missing opening marker", () => {
		expect(completed("$x$$", "$$x$$")).toEqual(["x"]);
	});

	test("editing inside a complete span", () => {
		expect(completed("$$x$$", "$$xy$$")).toEqual([]);
		expect(completed("$$xy$$", "$$x$$")).toEqual([]);
	});

	test("typing next to a complete span", () => {
		expect(completed("$$x$$", "$$x$$ ")).toEqual([]);
		expect(completed("$$x$$", "a$$x$$")).toEqual([]);
	});

	test("other markers need no following character", () => {
		expect(completed("\\(x\\", "\\(x\\)", "paren")).toEqual(["x"]);
		expect(completed("`x", "`x`", "backtick")).toEqual(["x"]);
		expect(completed("a$$x$", "a$$x$$b".slice(0, 6), "doubleDollar")).toEqual([
			"x",
		]);
	});

	describe("single dollar", () => {
		test("closing at the end of a line", () => {
			expect(completed("$x", "$x$", "dollar")).toEqual(["x"]);
		});

		test("closing before a word waits for a boundary", () => {
			expect(completed("$xy", "$x$y", "dollar")).toEqual([]);
			expect(completed("$x$y", "$x$ y", "dollar")).toEqual(["x"]);
		});

		test("deleting the character after the closer", () => {
			expect(completed("a $x$b", "a $x$", "dollar")).toEqual(["x"]);
		});

		test("deleting a space after the opener", () => {
			expect(completed("$ x$", "$x$", "dollar")).toEqual(["x"]);
		});

		test("a space after an already complete span", () => {
			expect(completed("$x$", "$x$ ", "dollar")).toEqual([]);
		});

		test("prices", () => {
			expect(completed("costs $5 and ", "costs $5 and $", "dollar")).toEqual(
				[],
			);
			expect(completed("costs $5 and $", "costs $5 and $1", "dollar")).toEqual(
				[],
			);
		});
	});

	describe("inserted text", () => {
		test("spans in the pasted text", () => {
			expect(
				completed("x  y", "x $$a$$ and $$b$$ y", "doubleDollar", "inserted"),
			).toEqual(["a", "b"]);
		});

		test("spans the paste overlaps", () => {
			expect(completed("$$a$$", "$$ab$$", "doubleDollar", "inserted")).toEqual([
				"ab",
			]);
		});

		test("across lines", () => {
			expect(
				completed("", "$$a$$\nno\n$$b$$", "doubleDollar", "inserted"),
			).toEqual(["a", "b"]);
		});

		test("spans elsewhere are left alone", () => {
			expect(
				completed("$$a$$ x", "$$a$$ xy", "doubleDollar", "inserted"),
			).toEqual([]);
		});
	});
});
