import { locate, type Segment } from "./segments.ts";

/** the text of a block of editable content */
export interface BlockText {
    /** the block's text, with a newline for each line break */
    text: string;
    /** the text nodes that make up `text`, in order */
    segments: Segment<Text>[];
    /** index of the caret in `text`, or the length of `text` without a caret */
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

/** how far into `node`'s text a caret is, if it's in or before `node` */
function caretOffset(node: Node, caretRange: Range): number | undefined {
    if (node instanceof Text && node === caretRange.startContainer) {
        return caretRange.startOffset;
    } else if (caretRange.comparePoint(node, 0) >= 0) {
        return 0;
    } else {
        return undefined;
    }
}

/** read the text of a block, with the caret's index if `caretRange` is inside it */
export function readBlock(
    container: HTMLElement,
    caretRange?: Range,
): BlockText {
    const walker = document.createTreeWalker(
        container,
        // biome-ignore lint/suspicious/noBitwiseOperators: whatToShow is a bit mask
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        (node) =>
            node instanceof Element && getComputedStyle(node).display === "none"
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
    );
    let text = "";
    let caret: number | undefined;
    const segments: Segment<Text>[] = [];
    for (
        let node = walker.nextNode();
        node !== null;
        node = walker.nextNode()
    ) {
        if (caretRange !== undefined && caret === undefined) {
            const offset = caretOffset(node, caretRange);
            caret = offset === undefined ? undefined : text.length + offset;
        }
        if (node instanceof Text) {
            segments.push({
                node,
                start: text.length,
                length: node.data.length,
            });
            text += node.data;
        } else if (node instanceof HTMLBRElement) {
            text += "\n";
        } else if (
            node instanceof Element &&
            isBlock(node) &&
            text !== "" &&
            !text.endsWith("\n")
        ) {
            text += "\n";
        }
    }
    return { text, segments, caret: caret ?? text.length };
}

/** the DOM range covering `[start, end)` of a block's text, if it still exists */
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
