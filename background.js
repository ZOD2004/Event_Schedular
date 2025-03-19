chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "scheduleEvent",
        title: "Schedule Event",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "scheduleEvent") {
        const selectedText = info.selectionText;

        // Store selected text for popup.js to use
        chrome.storage.local.set({ selectedText }, () => {
            console.log("Selected text saved:", selectedText);

            // Open popup.html immediately
            chrome.windows.create({
                url: "popup.html",
                type: "popup",
                width: 350,
                height: 250
            });
        });
    }
});
