import { describe, expect, test } from "bun:test";
import { type DelimiterName, findSpans, lineBounds } from "./delimiters";

function contents(line: string, name: DelimiterName): string[] {
	return findSpans(line, name).map(({ contentStart, contentEnd }) =>
		line.slice(contentStart, contentEnd),
	);
}

describe("dollar", () => {
	test("finds inline math", () => {
		expect(contents("let $x^2$ and $y_1$ be", "dollar")).toEqual([
			"x^2",
			"y_1",
		]);
	});

	test("span covers the delimiters", () => {
		expect(findSpans("a $x$ b", "dollar")).toEqual([
			{ start: 2, end: 5, contentStart: 3, contentEnd: 4 },
		]);
	});

	test("whole line", () => {
		expect(contents("$x$", "dollar")).toEqual(["x"]);
	});

	test("opener must start the line or follow whitespace", () => {
		expect(contents("a$x$ b", "dollar")).toEqual([]);
		expect(contents("($x$)", "dollar")).toEqual([]);
	});

	test("closer must end the line or precede whitespace or punctuation", () => {
		expect(contents("$x$, then $y$.", "dollar")).toEqual(["x", "y"]);
		expect(contents("$x$y", "dollar")).toEqual([]);
		expect(contents("$x$5", "dollar")).toEqual([]);
	});

	test("numbers alone are fine", () => {
		expect(contents("$5$", "dollar")).toEqual(["5"]);
	});

	test("prices don't match", () => {
		expect(contents("it costs $5 and $10", "dollar")).toEqual([]);
		expect(contents("between $5 and $6", "dollar")).toEqual([]);
		expect(contents("$20,000 to $30,000", "dollar")).toEqual([]);
		expect(contents("$5 or $6.", "dollar")).toEqual([]);
		expect(contents("$5 or $6. $y$", "dollar")).toEqual(["y"]);
	});

	test("a delimiter that can't close ends the attempt", () => {
		expect(contents("$x$5 $y$", "dollar")).toEqual(["y"]);
	});

	test("opener needs a non-space after it", () => {
		expect(contents("$ x$", "dollar")).toEqual([]);
	});

	test("closer needs a non-space before it", () => {
		expect(contents("$x $", "dollar")).toEqual([]);
	});

	test("unmatched opener doesn't swallow later math", () => {
		expect(contents("$ 5 and $x$", "dollar")).toEqual(["x"]);
	});

	test("escaped dollars are literal", () => {
		expect(contents("\\$x$", "dollar")).toEqual([]);
		expect(contents("$a\\$", "dollar")).toEqual([]);
		expect(contents("$a\\$ b$", "dollar")).toEqual(["a\\$ b"]);
	});

	test("double dollars aren't inline math", () => {
		expect(contents("$$x$$", "dollar")).toEqual([]);
		expect(contents("$$", "dollar")).toEqual([]);
	});
});

describe("other delimiters", () => {
	test("paren", () => {
		expect(contents("see \\(x^2\\) and \\( y \\)", "paren")).toEqual([
			"x^2",
			" y ",
		]);
		expect(contents("\\(\\)", "paren")).toEqual([]);
		expect(contents("\\\\(x\\)", "paren")).toEqual([]);
	});

	test("only single dollars need boundaries", () => {
		expect(contents("a\\(x\\)y", "paren")).toEqual(["x"]);
		expect(contents("a$$x$$ $$y$$z", "doubleDollar")).toEqual(["x", "y"]);
		expect(contents("a\\[x\\]b", "bracket")).toEqual(["x"]);
		expect(contents("a`x`b", "backtick")).toEqual(["x"]);
	});

	test("backtick", () => {
		expect(contents("`a` b `c`", "backtick")).toEqual(["a", "c"]);
		expect(contents("``", "backtick")).toEqual([]);
		expect(contents("`a `b`", "backtick")).toEqual(["a "]);
	});

	test("double dollar", () => {
		expect(contents("$$ x^2 $$ then $$y$$", "doubleDollar")).toEqual([
			" x^2 ",
			"y",
		]);
		expect(contents("$$5$$ and $$ 6 $$", "doubleDollar")).toEqual(["5", " 6 "]);
		expect(contents("$$x\\$$ y$$", "doubleDollar")).toEqual(["x\\$$ y"]);
		expect(contents("$x$", "doubleDollar")).toEqual([]);
		expect(contents("$$$x$$", "doubleDollar")).toEqual(["$x"]);
	});

	test("bracket", () => {
		expect(contents("\\[x\\]", "bracket")).toEqual(["x"]);
		expect(contents("\\[x\\]!", "bracket")).toEqual(["x"]);
	});
});

describe("lineBounds", () => {
	const text = "ab\ncd\n\nef";

	test("first line", () => {
		expect(lineBounds(text, 0)).toEqual({ start: 0, end: 2 });
		expect(lineBounds(text, 2)).toEqual({ start: 0, end: 2 });
	});

	test("middle line", () => {
		expect(lineBounds(text, 3)).toEqual({ start: 3, end: 5 });
	});

	test("empty line", () => {
		expect(lineBounds(text, 6)).toEqual({ start: 6, end: 6 });
	});

	test("last line", () => {
		expect(lineBounds(text, 9)).toEqual({ start: 7, end: 9 });
	});

	test("single line", () => {
		expect(lineBounds("abc", 1)).toEqual({ start: 0, end: 3 });
	});
});
