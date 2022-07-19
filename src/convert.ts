import parse from "./parse";
import render from "./render";
import { isOptions, defaultOptions } from "./options";

// replace selection on page
const selection = getSelection();
if (selection && selection.rangeCount) {
  // valid selection
  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    // non-empty selection
    chrome.storage.sync.get(defaultOptions, (opts) => {
      const options = isOptions(opts) ? opts : defaultOptions;
      const replacement = render(parse(selection.toString()), options);
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
    });
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
    chrome.storage.sync.get(defaultOptions, (opts) => {
      const options = isOptions(opts) ? opts : defaultOptions;
      const replacement = render(parse(value.slice(start, end)), options);
      active.value = value.slice(0, start) + replacement + value.slice(end);
      active.setSelectionRange(start, start + replacement.length);
    });
  }
}
