import { describe, expect, test } from "bun:test";
import { type DelimiterName, findSpans, lineBounds } from "./delimiters.ts";

function contents(line: string, name: DelimiterName): string[] {
    return findSpans(line, name).map(({ contentStart, contentEnd }) =>
        line.slice(contentStart, contentEnd),
    );
}

describe("findSpans", () => {
    test("paren", () => {
        expect(contents("see \\(x^2\\) and \\( y \\)", "paren")).toEqual([
            "x^2",
            " y ",
        ]);
        expect(contents("\\(\\)", "paren")).toEqual([]);
        expect(contents("\\\\(x\\)", "paren")).toEqual([]);
    });

    test("markers need no boundaries", () => {
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
        expect(contents("$$5$$ and $$ 6 $$", "doubleDollar")).toEqual([
            "5",
            " 6 ",
        ]);
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
