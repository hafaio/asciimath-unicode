import { convert } from "./message";

void (async () => {
	try {
		// replace selection on page
		const selection = getSelection();
		if (selection?.rangeCount) {
			// valid selection
			const range = selection.getRangeAt(0);
			if (!range.collapsed) {
				// non-empty selection
				const replacement = await convert(selection.toString());
				range.deleteContents();
				// insert replacement as a single text node so element-anchored
				// ranges (e.g. select-all) are handled the same as text ranges
				const node = document.createTextNode(replacement);
				range.insertNode(node);
				// reselect the inserted replacement
				range.selectNode(node);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}

		// replace selection in active element (input or text area)
		const active = document.activeElement;
		if (
			active instanceof HTMLInputElement ||
			active instanceof HTMLTextAreaElement
		) {
			const start = active.selectionStart;
			const end = active.selectionEnd;
			if (start !== null && end !== null && start < end) {
				const value = active.value;
				const replacement = await convert(value.slice(start, end));
				active.value = value.slice(0, start) + replacement + value.slice(end);
				active.setSelectionRange(start, start + replacement.length);
			}
		}
	} catch (err) {
		console.error("ascii-math-unicode conversion failed", err);
	}
})();
