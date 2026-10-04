/** the delimiters a user can choose between */
export const delimiterNames = [
    "doubleDollar",
    "paren",
    "bracket",
    "backtick",
] as const;

/** name of a delimiter, as stored in the options */
export type DelimiterName = (typeof delimiterNames)[number];

/** the markers around a span of math */
export interface Delimiter {
    /** marker that starts a span */
    open: string;
    /** marker that ends a span */
    close: string;
    /** shown in the options, around an x */
    display: string;
}

/** the markers of each delimiter */
export const delimiters: Record<DelimiterName, Delimiter> = {
    doubleDollar: { open: "$$", close: "$$", display: "$$x$$" },
    paren: { open: "\\(", close: "\\)", display: "\\(x\\)" },
    bracket: { open: "\\[", close: "\\]", display: "\\[x\\]" },
    backtick: { open: "`", close: "`", display: "`x`" },
};

/** a delimited span of a line */
export interface Span {
    /** index of the opening marker */
    start: number;
    /** index just past the closing marker */
    end: number;
    /** index just past the opening marker */
    contentStart: number;
    /** index of the closing marker */
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

/** the non-empty span whose opening marker is at `start`, if there is one */
function spanAt(
    line: string,
    start: number,
    { open, close }: Delimiter,
): Span | undefined {
    if (isMarker(line, start, open)) {
        const contentStart = start + open.length;
        let closeAt = contentStart + 1;
        while (closeAt < line.length && !isMarker(line, closeAt, close)) {
            closeAt++;
        }
        return closeAt < line.length
            ? {
                  start,
                  end: closeAt + close.length,
                  contentStart,
                  contentEnd: closeAt,
              }
            : undefined;
    } else {
        return undefined;
    }
}

/** find every non-empty delimited span in a line, pairing markers left to right */
export function findSpans(line: string, name: DelimiterName): Span[] {
    const spans: Span[] = [];
    let index = 0;
    while (index < line.length) {
        const span = spanAt(line, index, delimiters[name]);
        if (span === undefined) {
            index++;
        } else {
            spans.push(span);
            index = span.end;
        }
    }
    return spans;
}

/** bounds of the line containing `index` in multi-line `text`, without its newline */
export function lineBounds(
    text: string,
    index: number,
): { start: number; end: number } {
    const start = text.lastIndexOf("\n", index - 1) + 1;
    const newline = text.indexOf("\n", index);
    return { start, end: newline === -1 ? text.length : newline };
}
