import { locate, type Segment } from "./segments";

/** the text of the block around a caret in an editable element */
export interface BlockText {
	text: string;
	segments: Segment<Text>[];
	caret: number;
}

function isBlock(element: Element): boolean {
	const { display } = getComputedStyle(element);
	return !display.startsWith("inline") && display !== "contents";
}

/** the nearest block around `node` inside editable content */
export function lineContainer(node: Node): HTMLElement | null {
	let element = node instanceof HTMLElement ? node : node.parentElement;
	while (
		element !== null &&
		!isBlock(element) &&
		element.parentElement?.isContentEditable
	) {
		element = element.parentElement;
	}
	return element;
}

/** the text of a block, with the caret's index if it's inside the block */
export function readBlock(
	container: HTMLElement,
	caretRange?: Range,
): BlockText {
	const walker = document.createTreeWalker(
		container,
		NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
		(node) =>
			node instanceof Element && getComputedStyle(node).display === "none"
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT,
	);
	let text = "";
	let caret: number | undefined;
	const segments: Segment<Text>[] = [];
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		if (caretRange !== undefined && caret === undefined) {
			if (node instanceof Text && node === caretRange.startContainer) {
				caret = text.length + caretRange.startOffset;
			} else if (caretRange.comparePoint(node, 0) >= 0) {
				caret = text.length;
			}
		}
		if (node instanceof Text) {
			segments.push({ node, start: text.length, length: node.data.length });
			text += node.data;
		} else if (node instanceof HTMLBRElement) {
			text += "\n";
		} else if (node instanceof Element && isBlock(node) && text !== "") {
			if (!text.endsWith("\n")) {
				text += "\n";
			}
		}
	}
	return { text, segments, caret: caret ?? text.length };
}

export function blockRange(
	block: BlockText,
	start: number,
	end: number,
): Range | undefined {
	const from = locate(block.segments, start, "start");
	const to = locate(block.segments, end, "end");
	if (from === undefined || to === undefined) {
		return undefined;
	} else {
		const range = document.createRange();
		range.setStart(from.node, from.offset);
		range.setEnd(to.node, to.offset);
		return range;
	}
}
