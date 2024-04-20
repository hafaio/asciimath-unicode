import { convert } from "./message";

void (async () => {
  // replace selection on page
  const selection = getSelection();
  if (selection?.rangeCount) {
    // valid selection
    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      // non-empty selection
      const replacement = await convert(selection.toString());
      range.deleteContents();
      // reacquire selection after deleting to get true position
      const { startContainer, startOffset } = selection.getRangeAt(0);
      const content = startContainer.textContent ?? "";
      // replace content with spliced in replacement
      startContainer.textContent =
        content.slice(0, startOffset) +
        replacement +
        content.slice(startOffset);
      // this moves selection back to beginning, so reset it
      selection.collapse(startContainer, startOffset);
      selection.extend(startContainer, startOffset + replacement.length);
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
})();
