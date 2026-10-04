/** a form control that holds editable text */
export type TextField = HTMLInputElement | HTMLTextAreaElement;

// input types that hold free text and support selection ranges
const textInputTypes = new Set(["text", "search", "url", "tel"]);

/** whether an element is a text area or a free-text input */
export function isTextField(element: Element | null): element is TextField {
    return (
        element instanceof HTMLTextAreaElement ||
        (element instanceof HTMLInputElement &&
            textInputTypes.has(element.type))
    );
}

/** whether a node is inside editable content */
export function isEditableNode(node: Node): boolean {
    const element = node instanceof HTMLElement ? node : node.parentElement;
    return element?.isContentEditable ?? false;
}

/** the outermost editable element containing `node` */
export function editingHost(node: Node): HTMLElement | null {
    let host = node instanceof HTMLElement ? node : node.parentElement;
    if (!host?.isContentEditable) {
        return null;
    }
    while (host.parentElement?.isContentEditable) {
        host = host.parentElement;
    }
    return host;
}

/** replace `[start, end)` of a text field so that frameworks and the undo stack see the edit */
export function replaceInField(
    field: TextField,
    start: number,
    end: number,
    text: string,
): void {
    field.focus();
    field.setSelectionRange(start, end);
    if (!document.execCommand("insertText", false, text)) {
        field.setRangeText(text, start, end, "end");
        field.dispatchEvent(
            new InputEvent("input", {
                bubbles: true,
                inputType: "insertText",
                data: text,
            }),
        );
    }
}

/** replace a DOM range with text, through the editor when the range is editable */
export function replaceRange(range: Range, text: string): void {
    const selection = getSelection();
    if (selection && isEditableNode(range.commonAncestorContainer)) {
        selection.removeAllRanges();
        selection.addRange(range);
        if (document.execCommand("insertText", false, text)) {
            return;
        }
    }
    range.deleteContents();
    // insert replacement as a single text node so element-anchored
    // ranges (e.g. select-all) are handled the same as text ranges
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.selectNode(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
}
