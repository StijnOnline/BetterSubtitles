
chrome.runtime.onInstalled.addListener(() => {

});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    
});

function Inject(injectedEvent){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {        
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tabs[0].id, {message:"CheckInjected"}, (response) => {
                if(response) { //already injected
                    injectedEvent("Already injected");
                    return;
                }


                if (tab.status !== 'complete' || !/^http/.test(tab.url)) {
                    console.log("INJECT: tab not injectable (not complete or not http)");
                    injectedEvent("Tab not injectable");
                    return;
                }            

                chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ["./foreground_styles.css"]
                })
                .then(() => {
                    console.log("INJECTED THE FOREGROUND STYLES.");
                    
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["./foreground.js"]
                    })
                    .then(() => {
                        console.log("INJECTED THE FOREGROUND SCRIPT.");
                        injectedEvent("SuccesfullyInjected");
                    });
                })
                .catch(err => {
                    console.log(err);
                    injectedEvent(err);
                });
            });
        });

    });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'Inject') {
        Inject(sendResponse);
        return true;
    }else {
        console.log("Did not receive the response!!!")
    }
    
});


function SendMessageActiveTab(message) {
    console.log("Sending: " + message);
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {console.log("Response: " + response)});
    });
}