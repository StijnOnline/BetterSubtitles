chrome.runtime.onInstalled.addListener(() => {

});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
        chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["./foreground_styles.css"]
        })
            .then(() => {
                console.log("INJECTED THE FOREGROUND STYLES.");

                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["./foreground.js"]
                })
                    .then(() => {
                        console.log("INJECTED THE FOREGROUND SCRIPT.");
                    });
            })
            .catch(err => console.log(err));
    }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'foundVideoPlayers') {
        
        console.log("Backend Received VideoPlayers");
        console.log(request.foundVideoPlayers);
        sendResponse();

        return true;
    }else {
        console.log("Did not receive the response!!!")
    }
});