import { default as init, convert, Tone } from "../pkg/convert";
import { isOptions, defaultOptions } from "./options";
import { isSelectedMessage, Response } from "./message";

/** generic fucntion for running conversion script */
function convertSelectionOnTab(tab: chrome.tabs.Tab): void {
  if (tab.id) {
    // forget about this promise
    void chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["convert.js"],
    });
  } else {
    console.error("clicked on tab without an id");
  }
}

const initialize = init();

// add callback for rendering through wasm
chrome.runtime.onMessage.addListener(
  (message: unknown, _, send: (resp: Response) => void): boolean => {
    if (isSelectedMessage(message)) {
      Promise.all([chrome.storage.sync.get(defaultOptions), initialize]).then(
        ([opts]) => {
          const { vulgarFractions, scriptFractions, skinTone, pruneParens } =
            isOptions(opts) ? opts : defaultOptions;
          send({
            type: "result",
            result: convert(
              message.text,
              pruneParens,
              vulgarFractions,
              scriptFractions,
              Tone[skinTone],
            ),
          });
        },
        (err: unknown) => {
          console.error(err);
          send({ type: "error", err: "initializtion or storage error" });
        },
      );
    } else {
      send({ type: "error", err: "invalid message format" });
    }
    return true;
  },
);

// add convert when button clicked
chrome.action.onClicked.addListener(convertSelectionOnTab);

// add hot-key command
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "ascii-math-unicode") {
    convertSelectionOnTab(tab);
  } else {
    console.error("unknown command");
  }
});

// add convert context menu
const contextMenuId = "ascii math unicode";
chrome.contextMenus.create(
  {
    id: contextMenuId,
    title: "Render selection as ascii math",
    contexts: ["selection"],
  },
  () => {
    if (chrome.runtime.lastError) {
      console.error(
        "couldn't register context menu",
        chrome.runtime.lastError.message,
      );
    }
  },
);

chrome.contextMenus.onClicked.addListener(({ menuItemId }, tab) => {
  if (menuItemId === contextMenuId) {
    if (tab) {
      convertSelectionOnTab(tab);
    } else {
      console.error("context menu not on a tab");
    }
  } else {
    console.error("clicked a context menu that wasn't registered");
  }
});
