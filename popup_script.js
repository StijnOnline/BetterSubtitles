chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {message:"DetectVideoPlayers"}, (response) => {
        ListVideoPlayers(response);
    });
});

document.querySelector("#DetectVideoPlayers").addEventListener("click",
    function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {message:"DetectVideoPlayers"}, (response) => {
                ListVideoPlayers(response);
            });
        });
    }
);
document.querySelector("#AddSubtitles").addEventListener("click",
    function() {
        SendMessageActiveTab({message:"AddSubtitles"});
    }
);
document.querySelector("#RemoveSubtitles").addEventListener("click",
    function() {
        SendMessageActiveTab({message:"RemoveSubtitles"});
    }
);
document.querySelector("#SearchSubtitles").addEventListener("click",
    function() {
        SendMessageActiveTab({message:"SearchSubtitles",searchQuery: document.querySelector("#SearchSubtitlesInput").value});
    }
);

function SendMessageActiveTab(message) {
    console.log("Sending: " + message);
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {console.log("Response: " + response)});
    });
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
    console.log(response.videoPlayers);
    var videoPlayerListHTML = document.querySelector("#VideoPlayersList");
    videoPlayerListHTML.innerHTML = '';//remove all content

    if(!response.videoPlayers || response.videoPlayers.length == 0){
        var videoPlayerListItem = document.createElement('p');
        videoPlayerListItem.innerHTML = "No Videoplayer found";
        videoPlayerListHTML.appendChild(videoPlayerListItem);
        return;
    }

    videoPlayerListHTML.innerHTML = "Select Videoplayer:";
    for (let i = 0; i < response.videoPlayers.length; i++) {
        var videoPlayerListItem = document.createElement('button');
        videoPlayerListItem.id = "videoPlayer"+i;
        videoPlayerListItem.className  = "videoPlayerListItem";
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