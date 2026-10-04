export const delimiterNames = [
	"doubleDollar",
	"dollar",
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
	dollar: { open: "$", close: "$", display: "$x$" },
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

function isSpace(char: string | undefined): boolean {
	return char !== undefined && /\s/.test(char);
}

function isPunctuation(char: string | undefined): boolean {
	return char !== undefined && /\p{P}/u.test(char);
}

function isEscaped(line: string, index: number): boolean {
	let backslashes = 0;
	while (line[index - 1 - backslashes] === "\\") {
		backslashes++;
	}
	return backslashes % 2 === 1;
}

// Only a lone `$` has boundary rules, since it also appears in prose and
// prices: its opener starts a line or follows whitespace, its closer ends a
// line or precedes whitespace or punctuation, and, as in pandoc, the opener
// needs a non-space after it and the closer a non-space before it. A `$` next
// to another `$` belongs to `$$`.
function isOpener(line: string, index: number, name: DelimiterName): boolean {
	const { open } = delimiters[name];
	if (!line.startsWith(open, index) || isEscaped(line, index)) {
		return false;
	} else if (name === "dollar") {
		const previous = line[index - 1];
		const next = line[index + 1];
		return (
			(previous === undefined || isSpace(previous)) &&
			next !== undefined &&
			!isSpace(next) &&
			next !== "$"
		);
	} else {
		return true;
	}
}

function isCloser(line: string, index: number, name: DelimiterName): boolean {
	const { close } = delimiters[name];
	if (!line.startsWith(close, index) || isEscaped(line, index)) {
		return false;
	} else if (name === "dollar") {
		const previous = line[index - 1];
		const following = line[index + 1];
		return (
			!isSpace(previous) &&
			previous !== "$" &&
			(following === undefined ||
				isSpace(following) ||
				isPunctuation(following))
		);
	} else {
		return true;
	}
}

/** every non-empty delimited span in a line, paired left to right */
export function findSpans(line: string, name: DelimiterName): Span[] {
	const { open, close } = delimiters[name];
	const spans: Span[] = [];
	let index = 0;
	while (index < line.length) {
		if (isOpener(line, index, name)) {
			const contentStart = index + open.length;
			let closeAt = contentStart + 1;
			// stop at the first unescaped delimiter; one that can't close
			// the span means this opener doesn't start one
			while (
				closeAt < line.length &&
				!(line.startsWith(close, closeAt) && !isEscaped(line, closeAt))
			) {
				closeAt++;
			}
			if (closeAt < line.length && isCloser(line, closeAt, name)) {
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
