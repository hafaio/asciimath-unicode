import {
	type DelimiterName,
	findSpans,
	lineBounds,
	type Span,
} from "./delimiters";

/** a delimited span in absolute coordinates, with its content */
export interface MarkedSpan {
	start: number;
	end: number;
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

/** where `position` ends up after replacing `spans` */
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
	start: number;
	end: number;
	removed: number;
}

/** the edit that turned `before` into `after` */
export function textEdit(before: string, after: string): TextEdit {
	const shorter = Math.min(before.length, after.length);
	let prefix = 0;
	while (prefix < shorter && before[prefix] === after[prefix]) {
		prefix++;
	}
	let suffix = 0;
	while (
		suffix < shorter - prefix &&
		before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
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

/** the characters whose change can complete a span: markers and boundaries */
function completingZones(
	span: Span,
	delimiter: DelimiterName,
): [number, number][] {
	const markers: [number, number][] = [
		[span.start, span.contentStart],
		[span.contentEnd, span.end],
	];
	if (delimiter === "dollar") {
		return [
			...markers,
			[span.start - 1, span.start],
			[span.end, span.end + 1],
			[span.contentStart, span.contentStart + 1],
			[span.contentEnd - 1, span.contentEnd],
		];
	} else {
		return markers;
	}
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
 * Spans an edit completed. A typed or deleted edit completes a span when it
 * changes one of the span's markers or the characters its boundary rules
 * check, and the span wasn't already complete. Inserted text, as from a
 * paste, completes every span it overlaps.
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
					: completingZones(span, delimiter).some(([from, to]) =>
							editReaches(edit, from, to),
						) && !spanExisted(before, span, edit, delimiter);
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
