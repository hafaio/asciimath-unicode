import parse from "../lib/parse";
import render from "../lib/render";
import { isOptions, defaultOptions } from "../lib/options";

// replace selection
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
