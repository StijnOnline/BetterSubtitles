var videoPlayers = [];
var video;
var subTitleHTML;
var lastState = "None";
var currentState;
var apiKey = "FSyoIs4NDWMD65l1eIoL6llyiOwdVv2d";

//Load overlay HTML
var VideoOverlayHTML = document.createElement('DIV');
VideoOverlayHTML.id = "BetterSubtitlesOverlay";
fetch(chrome.runtime.getURL("Data/BetterSubtitlesOverlay.html"))
    .then(response=> response.text())
    .then(response=> {
        VideoOverlayHTML.innerHTML = response;

        VideoOverlayHTML.querySelectorAll("img").forEach(img => {
            img.src = chrome.runtime.getURL(img.getAttribute('src'));
        });

        //Add listeners
        var SearchSubtitlesButton = VideoOverlayHTML.querySelector("#SearchSubtitlesButton");
        SearchSubtitlesButton.addEventListener("click", function() {
            SearchSubtitles();
        });
    });




chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.message){console.log("Received message: " + request.message);}

    if (request.message === 'CheckInjected') {
        sendResponse({message:"already injected"});
        return true;
    }else if (request.message === 'DetectVideoPlayers') {  
        var _videoPlayers = DetectVideoPlayers();
        sendResponse({videoPlayers:_videoPlayers});
        return true;
    }else if (request.message === 'MouseEnterVideoPlayer') {
        MouseEnterVideoPlayer(request.index);
        sendResponse();
        return true;
    }else if (request.message === 'MouseLeaveVideoPlayer') { 
        MouseLeaveVideoPlayer();
        sendResponse();
        return true;
    }else if (request.message === 'SelectVideoPlayer') {
        SelectVideoPlayer(request.index);
        sendResponse();
        return true;
    }
});

function DetectVideoPlayers(){
    videoPlayers = [];
    let videoPlayerTexts = [];
    document.querySelectorAll('video').forEach(video => {
        if(video.src) {
            videoPlayers.push(video);
            videoPlayerTexts.push(video.src);
        }
    });
    return videoPlayerTexts;
}

function MouseEnterVideoPlayer(index) {
    SetOverlayState("Highlight")
    //videoPlayers[index].parentElement.style = "height : 100%;"; //make sure parent has height (youtube doesnt)
    ParentOverlay(videoPlayers[index]);
}
function MouseLeaveVideoPlayer() {
    VideoOverlayHTML.parentElement.removeChild(VideoOverlayHTML);

    if(video){
        if(currentState==="Highlight")SetOverlayState(lastState);
        else SetOverlayState(currentState);
        ParentOverlay(video);
    }
}
function ParentOverlay(video) {
    if(new RegExp('youtube.com').test(document.URL)){
        video.parentElement.parentElement.appendChild(VideoOverlayHTML);
    }else if(new RegExp('netflix.com').test(document.URL)){
        video.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.appendChild(VideoOverlayHTML);
    }else{
        video.parentElement.appendChild(VideoOverlayHTML);
    }
}
function SelectVideoPlayer(index) {
    video = videoPlayers[index];
    SetOverlayState("SearchSubtitles")
}
function SetOverlayState(state) {
    lastState = currentState;
    VideoOverlayHTML.querySelector('#VideoHighlight').hidden = (state !== 'Highlight');
    VideoOverlayHTML.querySelector('#SearchSubtitlesOverlay').hidden = (state !== 'SearchSubtitles');
    currentState = state;
}

function AddSubtitles() {
    console.log(`Adding Subtitles`);
    //console.log(`Searching videos on webpage`);
    

    if(videoPlayers.length>0){
        video = videoPlayers[0];
        RemoveSubtitles();

        subTitleHTML = document.createElement('DIV');
        subTitleHTML.style = " position: absolute; text-align: center; width: 100%;  font-size: 30px; bottom: 10%; z-index : 10000;";
        subTitleHTML.innerHTML = `Hello<br>World`;
    
        video.parentElement.parentElement.appendChild(subTitleHTML);
    }
}
function RemoveSubtitles() {
    if(subTitleHTML){
        subTitleHTML.parentElement.removeChild(subtitels);
    }
}

function SearchSubtitles(searchQuery) {
    var searchQuery = VideoOverlayHTML.querySelector("#SearchSubtitlesInput").value.replaceAll(' ','+');
    console.log(`Searching Subtitles: `+ searchQuery);
    
    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': apiKey}, mode: 'cors',};
    const url = `https://api.opensubtitles.com/api/v1/subtitles?query=${searchQuery}`;
    fetch(url, options)
    .then(response => response.json())
    .then(response => {
        console.log(response); 

        var SearchSubtitlesResultsContainer = document.querySelector("#SearchSubtitlesResultsContainer");
        SearchSubtitlesResultsContainer.innerHTML = '';//remove all content

        if(!response || !response.data || response.data.length == 0){
            var SomethingWentWrong = document.createElement('p');
            SomethingWentWrong.innerHTML = "Something went wrong";

            if(!response && response.errors){
                SomethingWentWrong.innerHTML = response.errors[0];
            }

            SearchSubtitlesResultsContainer.appendChild(SomethingWentWrong);
            return;
        }

        //Add movies to list
        for (let i = 0; i < response.data.length; i++) {
            var subtitleResultListItem = document.createElement('button');
            subtitleResultListItem.className  = "subtitleResultListItem";
            subtitleResultListItem.innerHTML = response.data[i].attributes.feature_details.movie_name;
            SearchSubtitlesResultsContainer.appendChild(subtitleResultListItem);
            subtitleResultListItem.addEventListener("click", function() {
                console.log(`Clicked [${i}] movie: ${movieName}`); 
            });
            SearchSubtitlesResultsContainer.appendChild(document.createElement('br'));
        }

        var movieName = response.data[0].attributes.feature_details.movie_name;
        console.log(`First result movie: ${movieName}`); 
        if(subTitleHTML){
            subTitleHTML.innerHTML = movieName;
        }
    }).catch(err => console.error(err));

    
}

