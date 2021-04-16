function convertSelectionOnTab(tab: chrome.tabs.Tab): void {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["dist/convert.bundle.js"],
    });
  } else {
    console.error("clicked on tab without an id");
  }
}

// add convert when button clicked
chrome.action.onClicked.addListener(convertSelectionOnTab);

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "ascii-math-unicode") {
    convertSelectionOnTab(tab);
  } else {
    console.error("unknown command");
  }
});

// add convert context menu
const contextMenuId = chrome.contextMenus.create(
  {
    id: "context menu",
    title: "Render selection as ascii math",
    contexts: ["selection"],
  },
  () => {
    if (chrome.runtime.lastError) {
      console.error(
        "couldn't register context menu",
        chrome.runtime.lastError.message
      );
    }
  }
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
