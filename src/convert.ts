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
      range.insertNode(document.createTextNode(replacement));
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
