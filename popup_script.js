//POPUP OPENED
RequestInject();
document.querySelector("#DetectVideoPlayers").addEventListener("click", RequestInject );
document.querySelector("#SyncSubtitles").addEventListener("click", async ()=>{SendMessageActiveTab({message:"SyncSubtitles"});} );


//Ask for inject (if not already)
//on response, ask DetectVideoPlayers
async function RequestInject(){
    chrome.runtime.sendMessage({message:"Inject"}, async (response) => {
        {console.log("Response: " + response);}
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {message:"DetectVideoPlayers"}, (response) => {
                ListVideoPlayers(response);
            });
        });
    });
}



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.message){console.log("Received message: " + request.message);}
    if (request.message === 'bla') {
        
    }
});


function SendMessageActiveTab(message) {
    console.log("Sending: " + message);
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {console.log("Response: " + response)});
    });
}
function SendMessage(message) {
    console.log("Sending: " + message);
    chrome.runtime.sendMessage(message, (response) => {console.log("Response: " + response)});
}

function GetVideoPlayers() {

    console.log("Requesting VideoPlayers");
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        // Retrieve the first tab in the query result (should be the active tab)
        const activeTab = tabs[0];
        
        // Log the URL of the active tab to the console
        console.log(`Active tab URL: ${activeTab.url}`);
        chrome.tabs.sendMessage(activeTab.id, {message:"GetVideoPlayers"},(response)=>{ListVideoPlayers(response);});
      });
        
    
}

function ListVideoPlayers(response){
    var videoPlayerListHTML = document.querySelector("#VideoPlayersList");
    videoPlayerListHTML.innerHTML = '';//remove all content

    if(!response || !response.videoPlayers || response.videoPlayers.length == 0){
        var videoPlayerListItem = document.createElement('p');
        videoPlayerListItem.innerHTML = `No Videoplayer found`;
        videoPlayerListHTML.appendChild(videoPlayerListItem);
        return;
    }

    console.log(response.videoPlayers);
    for (let i = 0; i < response.videoPlayers.length; i++) {
        var videoPlayerListItem = document.createElement('button');
        videoPlayerListItem.id = "videoPlayer"+i;
        videoPlayerListItem.className  = "VideoPlayerListItem";
        videoPlayerListItem.innerHTML = response.videoPlayers;
        videoPlayerListHTML.appendChild(videoPlayerListItem);
        videoPlayerListItem.addEventListener("mouseenter", function() {
            SendMessageActiveTab({message:"MouseEnterVideoPlayer",index:i});
        });
        videoPlayerListItem.addEventListener("mouseleave", function() {
            SendMessageActiveTab({message:"MouseLeaveVideoPlayer",index:i});
        });
        videoPlayerListItem.addEventListener("click", function() {
            SendMessageActiveTab({message:"SelectVideoPlayer",index:i});
        });
    
    }

}