export const delimiterNames = [
	"doubleDollar",
	"paren",
	"bracket",
	"backtick",
] as const;

export type DelimiterName = (typeof delimiterNames)[number];

export interface Delimiter {
	open: string;
	close: string;
	/** shown in the options, around an x */
	display: string;
}

export const delimiters: Record<DelimiterName, Delimiter> = {
	doubleDollar: { open: "$$", close: "$$", display: "$$x$$" },
	paren: { open: "\\(", close: "\\)", display: "\\(x\\)" },
	bracket: { open: "\\[", close: "\\]", display: "\\[x\\]" },
	backtick: { open: "`", close: "`", display: "`x`" },
};

/** a delimited span of a line; `start`/`end` include the delimiters */
export interface Span {
	start: number;
	end: number;
	contentStart: number;
	contentEnd: number;
}

function isEscaped(line: string, index: number): boolean {
	let backslashes = 0;
	while (line[index - 1 - backslashes] === "\\") {
		backslashes++;
	}
	return backslashes % 2 === 1;
}

function isMarker(line: string, index: number, marker: string): boolean {
	return line.startsWith(marker, index) && !isEscaped(line, index);
}

/** every non-empty delimited span in a line, paired left to right */
export function findSpans(line: string, name: DelimiterName): Span[] {
	const { open, close } = delimiters[name];
	const spans: Span[] = [];
	let index = 0;
	while (index < line.length) {
		if (isMarker(line, index, open)) {
			const contentStart = index + open.length;
			let closeAt = contentStart + 1;
			while (closeAt < line.length && !isMarker(line, closeAt, close)) {
				closeAt++;
			}
			if (closeAt < line.length) {
				const end = closeAt + close.length;
				spans.push({ start: index, end, contentStart, contentEnd: closeAt });
				index = end;
				continue;
			}
		}
		index++;
	}
	return spans;
}

/** bounds of the line containing `index` within multi-line `text` */
export function lineBounds(
	text: string,
	index: number,
): { start: number; end: number } {
	const start = text.lastIndexOf("\n", index - 1) + 1;
	const newline = text.indexOf("\n", index);
	return { start, end: newline === -1 ? text.length : newline };
}
