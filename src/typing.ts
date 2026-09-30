import { blockRange, lineContainer, readBlock } from "./blocktext";
import type { DelimiterName } from "./delimiters";
import {
	editingHost,
	isEditableNode,
	isTextField,
	replaceInField,
	replaceRange,
	type TextField,
} from "./editing";
import {
	convert,
	pingAutosubMessageSchema,
	stopAutosubMessageSchema,
} from "./message";
import { defaultOptions, optionsSchema, readOptions } from "./options";
import { completedSpans, mapPosition, replaceSpans, textEdit } from "./regions";

// editable hosts with less text than this are compared whole
const wholeHostLimit = 20_000;

/** the edited text as it was before an edit */
type Snapshot =
	| { field: TextField; before: string }
	| { container: HTMLElement; before: string };

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

/** the text an edit to `target` can change, as it is now */
function snapshot(target: EventTarget): Snapshot | undefined {
	if (target instanceof Element && isTextField(target)) {
		return isInputProxy(target)
			? undefined
			: { field: target, before: target.value };
	} else if (target instanceof Node && isEditableNode(target)) {
		const host = editingHost(target);
		const anchor = getSelection()?.anchorNode;
		const container =
			host !== null && (host.textContent?.length ?? 0) <= wholeHostLimit
				? host
				: anchor
					? lineContainer(anchor)
					: null;
		return container
			? { container, before: readBlock(container).text }
			: undefined;
	} else {
		return undefined;
	}
}

/**
 * Convert delimited math as it's typed anywhere in the document, returning a
 * function that stops. `answerWorker` makes the worker able to ping and stop
 * this copy, which only a content script should allow.
 */
export function startConverting(answerWorker: boolean): () => void {
	let delimiter: DelimiterName = defaultOptions.delimiter;
	// set while we insert, so our own edits aren't mistaken for the user's
	let replacing = false;
	let stopped = false;
	let pending: PendingEdit | undefined;
	let composing: Snapshot | undefined;

	void readOptions().then((options) => {
		delimiter = options.delimiter;
	});
	function onStorageChanged(
		changes: Record<string, chrome.storage.StorageChange>,
		area: string,
	): void {
		const parsed = optionsSchema.shape.delimiter.safeParse(
			changes.delimiter?.newValue,
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
		const first = spans[0];
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
			return range ? [{ range, content, original: range.toString() }] : [];
		});
		if (found.length === 0) {
			return;
		}
		const replacements = await Promise.all(
			found.map(({ content }) => convert(content)),
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
		const spanEnd =
			found.length === 1 ? found[0]!.range.cloneRange() : undefined;
		spanEnd?.collapse(false);
		const caretAtSpanEnd =
			savedCaret !== undefined &&
			spanEnd !== undefined &&
			savedCaret.collapsed &&
			spanEnd.compareBoundaryPoints(Range.START_TO_START, savedCaret) === 0;
		replacing = true;
		try {
			// last first, so each replacement leaves the earlier ones in place
			for (let index = found.length - 1; index >= 0; index--) {
				const { range, original } = found[index]!;
				// Editors like Lexical sync their selection from the
				// asynchronous selectionchange event, so let it arrive.
				selection?.removeAllRanges();
				selection?.addRange(range);
				await nextTask();
				// ranges are live, so this skips spans edited in the meantime
				if (range.toString() === original) {
					replaceRange(range, replacements[index]!);
				}
			}
		} finally {
			replacing = false;
		}
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
			const inserted =
				event.type === "paste" ||
				event.type === "drop" ||
				inputType === "insertFromPaste" ||
				inputType === "insertFromDrop";
			schedule({ snapshot: taken, kind: inserted ? "inserted" : "typed" });
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
