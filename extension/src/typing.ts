import { blockRange, lineContainer, readBlock } from "./blocktext.ts";
import type { DelimiterName } from "./delimiters.ts";
import {
    editingHost,
    isEditableNode,
    isTextField,
    replaceInField,
    replaceRange,
    type TextField,
} from "./editing.ts";
import {
    convert,
    pingAutosubMessageSchema,
    stopAutosubMessageSchema,
} from "./message.ts";
import { defaultOptions, optionsSchema, readOptions } from "./options.ts";
import {
    completedSpans,
    mapPosition,
    replaceSpans,
    textEdit,
} from "./regions.ts";

// editable hosts with less text than this are compared whole
const wholeHostLimit = 20_000;

/** the edited text as it was before an edit */
type Snapshot =
    | { field: TextField; before: string }
    | { container: HTMLElement; before: string };

/** a live range of editable text, with what to put in its place */
interface RangeReplacement {
    range: Range;
    // the range's text when it was found
    original: string;
    replacement: string;
}

/** an edit to handle once it has landed */
interface PendingEdit {
    snapshot: Snapshot;
    kind: "typed" | "inserted";
}

function nextTask(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve);
    });
}

function logFailure(err: unknown): void {
    console.error("ascii-math-unicode substitution failed", err);
}

/**
 * Code editors like Monaco and Ace take keystrokes through a tiny hidden
 * textarea that holds only part of the text, so editing it corrupts theirs.
 */
function isInputProxy(field: TextField): boolean {
    return field.offsetWidth < 4 || field.offsetHeight < 4;
}

/** the editable text an edit at `target` can change: the host, or one block */
function editedContainer(target: Node): HTMLElement | null {
    const host = editingHost(target);
    if (host !== null && (host.textContent?.length ?? 0) <= wholeHostLimit) {
        return host;
    } else {
        const anchor = getSelection()?.anchorNode;
        return anchor ? lineContainer(anchor) : null;
    }
}

/** whether a collapsed caret sits right after the only range */
function caretEndsOnlyRange(
    caret: Range | undefined,
    ranges: readonly Range[],
): boolean {
    const [only, ...others] = ranges;
    if (
        caret === undefined ||
        only === undefined ||
        others.length > 0 ||
        !caret.collapsed
    ) {
        return false;
    } else {
        const end = only.cloneRange();
        end.collapse(false);
        return end.compareBoundaryPoints(Range.START_TO_START, caret) === 0;
    }
}

/** whether an edit brings in text from elsewhere, as a paste or drop does */
function isInsertion(event: Event, inputType: string): boolean {
    return (
        event.type === "paste" ||
        event.type === "drop" ||
        inputType === "insertFromPaste" ||
        inputType === "insertFromDrop"
    );
}

/** the text an edit to `target` can change, as it is now */
function snapshot(target: EventTarget): Snapshot | undefined {
    if (target instanceof Element && isTextField(target)) {
        return isInputProxy(target)
            ? undefined
            : { field: target, before: target.value };
    } else if (target instanceof Node && isEditableNode(target)) {
        const container = editedContainer(target);
        return container
            ? { container, before: readBlock(container).text }
            : undefined;
    } else {
        return undefined;
    }
}

/**
 * convert delimited math as it's typed anywhere in the document
 *
 * Watches edits to text fields and editable content. When an edit completes a
 * span between the stored delimiter's markers, the span is replaced by its
 * unicode in one undoable step and the caret keeps its place. Pasted or
 * dropped text converts every complete span it brings. Undo and redo are left
 * alone, so math that was restored stays as typed.
 *
 * The delimiter comes from the stored options ({@link readOptions}) and
 * follows later changes to them. The conversion itself is done by the worker, through
 * {@link convert}.
 *
 * @param answerWorker - let the worker ping and stop this copy, which only a
 *   content script should allow
 * @returns a function that stops converting
 *
 * @example
 * ```ts
 * const stop = startConverting(false);
 * // later
 * stop();
 * ```
 */
export function startConverting(answerWorker: boolean): () => void {
    let delimiter: DelimiterName = defaultOptions.delimiter;
    // set while we insert, so our own edits aren't mistaken for the user's
    let replacing = false;
    let stopped = false;
    let pending: PendingEdit | undefined;
    let composing: Snapshot | undefined;

    void readOptions().then((options) => {
        ({ delimiter } = options);
    });
    function onStorageChanged(
        changes: Record<string, chrome.storage.StorageChange>,
        area: string,
    ): void {
        const parsed = optionsSchema.shape.delimiter.safeParse(
            changes["delimiter"]?.newValue,
        );
        if (area === "sync" && parsed.success) {
            delimiter = parsed.data;
        }
    }

    async function convertField(
        field: TextField,
        before: string,
        kind: PendingEdit["kind"],
    ): Promise<void> {
        const after = field.value;
        const spans = completedSpans(
            before,
            after,
            textEdit(before, after),
            delimiter,
            kind,
        );
        const [first] = spans;
        const last = spans.at(-1);
        if (first === undefined || last === undefined) {
            return;
        }
        const replacements = await Promise.all(
            spans.map(({ content }) => convert(content)),
        );
        // typing after the spans while converting leaves them in place
        if (
            stopped ||
            field.value.slice(0, last.end) !== after.slice(0, last.end)
        ) {
            return;
        }
        const caretStart = field.selectionStart ?? last.end;
        const caretEnd = field.selectionEnd ?? caretStart;
        // replacing focuses the field, so hand focus back if the user moved on
        const focused = document.activeElement;
        replacing = true;
        try {
            // one insertion for all spans, so one undo restores them
            replaceInField(
                field,
                first.start,
                last.end,
                replaceSpans(after, first.start, last.end, spans, replacements),
            );
        } finally {
            replacing = false;
        }
        field.setSelectionRange(
            mapPosition(caretStart, spans, replacements),
            mapPosition(caretEnd, spans, replacements),
        );
        if (focused instanceof HTMLElement && focused !== field) {
            focused.focus();
        }
    }

    async function replaceRanges(
        replacements: readonly RangeReplacement[],
        selection: Selection | null,
    ): Promise<void> {
        replacing = true;
        try {
            // last first, so each replacement leaves the earlier ones in place
            for (const {
                range,
                original,
                replacement,
            } of replacements.toReversed()) {
                // Editors like Lexical sync their selection from the
                // asynchronous selectionchange event, so let it arrive.
                selection?.removeAllRanges();
                selection?.addRange(range);
                // biome-ignore lint/performance/noAwaitInLoops: each replacement has to land before the next is selected
                await nextTask();
                // ranges are live, so this skips spans edited in the meantime
                if (range.toString() === original) {
                    replaceRange(range, replacement);
                }
            }
        } finally {
            replacing = false;
        }
    }

    async function convertEditable(
        container: HTMLElement,
        before: string,
        kind: PendingEdit["kind"],
    ): Promise<void> {
        // editors sometimes replace the edited block rather than change it
        if (!container.isConnected) {
            return;
        }
        const block = readBlock(container);
        const found = completedSpans(
            before,
            block.text,
            textEdit(before, block.text),
            delimiter,
            kind,
        ).flatMap(({ start, end, content }) => {
            const range = blockRange(block, start, end);
            return range
                ? [{ range, content, original: range.toString() }]
                : [];
        });
        if (found.length === 0) {
            return;
        }
        const converted = await Promise.all(
            found.map(async ({ range, content, original }) => ({
                range,
                original,
                replacement: await convert(content),
            })),
        );
        if (stopped) {
            return;
        }
        const selection = getSelection();
        const savedCaret = selection?.rangeCount
            ? selection.getRangeAt(0).cloneRange()
            : undefined;
        // Inserting leaves the caret after the inserted text, which is where a
        // caret right after a single span belongs. Restoring a saved range
        // there fails in editors like Quill that rebuild the text node.
        const caretAtSpanEnd = caretEndsOnlyRange(
            savedCaret,
            converted.map(({ range }) => range),
        );
        await replaceRanges(converted, selection);
        if (selection && savedCaret && !caretAtSpanEnd) {
            selection.removeAllRanges();
            selection.addRange(savedCaret);
        }
    }

    function run({ snapshot: taken, kind }: PendingEdit): Promise<void> {
        return "field" in taken
            ? convertField(taken.field, taken.before, kind)
            : convertEditable(taken.container, taken.before, kind);
    }

    /** handle an edit a tick from now, once it has landed */
    function schedule(edit: PendingEdit): void {
        pending = edit;
        setTimeout(() => {
            pending = undefined;
            run(edit).catch(logFailure);
        });
    }

    // Snapshot the text as an edit starts. Editors that cancel beforeinput,
    // or handle paste themselves, apply the edit without an input event.
    function onEdit(event: Event): void {
        if (
            replacing ||
            pending !== undefined ||
            (event instanceof InputEvent && event.isComposing)
        ) {
            return;
        }
        const inputType = event instanceof InputEvent ? event.inputType : "";
        // undo and redo restore text as it was, which must stay as typed
        if (inputType === "historyUndo" || inputType === "historyRedo") {
            return;
        }
        const [target] = event.composedPath();
        const taken = target && snapshot(target);
        if (taken !== undefined) {
            schedule({
                snapshot: taken,
                kind: isInsertion(event, inputType) ? "inserted" : "typed",
            });
        }
    }

    function onCompositionStart(event: Event): void {
        const [target] = event.composedPath();
        composing = target && snapshot(target);
    }

    function onCompositionEnd(): void {
        if (composing !== undefined && !replacing) {
            schedule({ snapshot: composing, kind: "typed" });
        }
        composing = undefined;
    }

    function onMessage(
        message: unknown,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: boolean) => void,
    ): void {
        if (stopAutosubMessageSchema.safeParse(message).success) {
            stop();
        } else if (pingAutosubMessageSchema.safeParse(message).success) {
            sendResponse(true);
        }
    }

    const listeners: [string, (event: Event) => void][] = [
        ["beforeinput", onEdit],
        ["paste", onEdit],
        ["drop", onEdit],
        ["cut", onEdit],
        ["compositionstart", onCompositionStart],
        ["compositionend", onCompositionEnd],
    ];

    function stop(): void {
        stopped = true;
        for (const [type, listener] of listeners) {
            document.removeEventListener(type, listener, true);
        }
        chrome.storage.onChanged.removeListener(onStorageChanged);
        chrome.runtime.onMessage.removeListener(onMessage);
    }

    for (const [type, listener] of listeners) {
        document.addEventListener(type, listener, true);
    }
    chrome.storage.onChanged.addListener(onStorageChanged);
    if (answerWorker) {
        chrome.runtime.onMessage.addListener(onMessage);
    }
    return stop;
}
