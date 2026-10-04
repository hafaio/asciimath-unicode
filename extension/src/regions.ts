import {
    type DelimiterName,
    findSpans,
    lineBounds,
    type Span,
} from "./delimiters.ts";

/** a delimited span in absolute coordinates, with its content */
export interface MarkedSpan {
    /** index of the opening marker */
    start: number;
    /** index just past the closing marker */
    end: number;
    /** the text between the markers */
    content: string;
}

/** `text[start, end)` with each span swapped for its replacement */
export function replaceSpans(
    text: string,
    start: number,
    end: number,
    spans: readonly MarkedSpan[],
    replacements: readonly string[],
): string {
    let result = "";
    let cursor = start;
    spans.forEach((span, index) => {
        result += text.slice(cursor, span.start) + replacements[index];
        cursor = span.end;
    });
    return result + text.slice(cursor, end);
}

/** find where `position` ends up after replacing `spans` */
export function mapPosition(
    position: number,
    spans: readonly MarkedSpan[],
    replacements: readonly string[],
): number {
    let shift = 0;
    spans.forEach(({ start, end }, index) => {
        if (end <= position) {
            shift += (replacements[index] ?? "").length - (end - start);
        } else if (start < position) {
            shift += start + (replacements[index] ?? "").length - position;
        }
    });
    return position + shift;
}

/** an edit that replaced `removed` characters with `after[start, end)` */
export interface TextEdit {
    /** index where the edit starts, in both texts */
    start: number;
    /** index in the new text just past what the edit put in */
    end: number;
    /** number of characters of the old text the edit took out */
    removed: number;
}

/** find the smallest single edit that turns `before` into `after` */
export function textEdit(before: string, after: string): TextEdit {
    const shorter = Math.min(before.length, after.length);
    let prefix = 0;
    while (
        prefix < shorter &&
        before.charCodeAt(prefix) === after.charCodeAt(prefix)
    ) {
        prefix++;
    }
    let suffix = 0;
    while (
        suffix < shorter - prefix &&
        before.at(-1 - suffix) === after.at(-1 - suffix)
    ) {
        suffix++;
    }
    return {
        start: prefix,
        end: after.length - suffix,
        removed: before.length - suffix - prefix,
    };
}

/** whether an edit covers or, for a pure deletion, touches `[from, to)` */
function editReaches(edit: TextEdit, from: number, to: number): boolean {
    return edit.start === edit.end
        ? from <= edit.start && edit.start <= to
        : edit.start < to && from < edit.end;
}

/** where a position in `after` was in `before`, if it wasn't in the edit */
function positionBefore(position: number, edit: TextEdit): number | undefined {
    if (position <= edit.start) {
        return position;
    } else if (position >= edit.end) {
        return position - (edit.end - edit.start) + edit.removed;
    } else {
        return undefined;
    }
}

function spanExisted(
    before: string,
    span: Span,
    edit: TextEdit,
    delimiter: DelimiterName,
): boolean {
    const start = positionBefore(span.start, edit);
    const end = positionBefore(span.end, edit);
    if (start === undefined || end === undefined) {
        return false;
    }
    const line = lineBounds(before, start);
    return findSpans(before.slice(line.start, line.end), delimiter).some(
        (existing) =>
            line.start + existing.start === start &&
            line.start + existing.end === end,
    );
}

/**
 * find the spans an edit completed
 *
 * A typed edit, which includes deleting, completes a span when it changes one
 * of the span's markers and the span wasn't already complete. Inserted text,
 * as from a paste, completes every span it overlaps.
 */
export function completedSpans(
    before: string,
    after: string,
    edit: TextEdit,
    delimiter: DelimiterName,
    kind: "typed" | "inserted",
): MarkedSpan[] {
    const completed: MarkedSpan[] = [];
    let lineStart = lineBounds(after, edit.start).start;
    const lastLineEnd = lineBounds(after, edit.end).end;
    while (lineStart <= lastLineEnd) {
        const { end: lineEnd } = lineBounds(after, lineStart);
        for (const relative of findSpans(
            after.slice(lineStart, lineEnd),
            delimiter,
        )) {
            const span: Span = {
                start: lineStart + relative.start,
                end: lineStart + relative.end,
                contentStart: lineStart + relative.contentStart,
                contentEnd: lineStart + relative.contentEnd,
            };
            const isCompleted =
                kind === "inserted"
                    ? edit.start < span.end && span.start < edit.end
                    : (editReaches(edit, span.start, span.contentStart) ||
                          editReaches(edit, span.contentEnd, span.end)) &&
                      !spanExisted(before, span, edit, delimiter);
            if (isCompleted) {
                completed.push({
                    start: span.start,
                    end: span.end,
                    content: after.slice(span.contentStart, span.contentEnd),
                });
            }
        }
        lineStart = lineEnd + 1;
    }
    return completed;
}
