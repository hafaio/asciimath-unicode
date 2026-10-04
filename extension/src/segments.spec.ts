import { expect, test } from "bun:test";
import { locate, type Segment } from "./segments";

// "ab" + "cd" + "\n" + "ef", as nodes a, b, and c
const segments: Segment<string>[] = [
	{ node: "a", start: 0, length: 2 },
	{ node: "b", start: 2, length: 2 },
	{ node: "c", start: 5, length: 2 },
];

test("inside a node", () => {
	expect(locate(segments, 1, "start")).toEqual({ node: "a", offset: 1 });
	expect(locate(segments, 1, "end")).toEqual({ node: "a", offset: 1 });
});

test("boundary between nodes", () => {
	expect(locate(segments, 2, "start")).toEqual({ node: "b", offset: 0 });
	expect(locate(segments, 2, "end")).toEqual({ node: "a", offset: 2 });
});

test("text edges", () => {
	expect(locate(segments, 0, "end")).toEqual({ node: "a", offset: 0 });
	expect(locate(segments, 7, "start")).toEqual({ node: "c", offset: 2 });
});

test("after a line break", () => {
	expect(locate(segments, 5, "start")).toEqual({ node: "c", offset: 0 });
	expect(locate(segments, 4, "end")).toEqual({ node: "b", offset: 2 });
});

test("the line break itself", () => {
	expect(locate(segments, 4, "start")).toEqual({ node: "b", offset: 2 });
});

test("out of range", () => {
	expect(locate(segments, 9, "start")).toBeUndefined();
	expect(locate([], 0, "end")).toBeUndefined();
});
