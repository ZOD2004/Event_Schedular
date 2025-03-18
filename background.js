chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "EventDetail",
        title: "Schedule Event",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "EventDetail" && info.selectionText.trim().length > 0) {
        chrome.storage.local.set({ selectedText: info.selectionText }, () => {
            chrome.windows.create({
                url: "popup.html",
                type: "popup",
                width: 400,
                height: 300
            });
        });
    }
});
