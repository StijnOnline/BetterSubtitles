var videoPlayers = [];
var video;
var subTitleHTML;
var apiKey = "FSyoIs4NDWMD65l1eIoL6llyiOwdVv2d";

var VideoOverlayHTML = document.createElement('DIV');
VideoOverlayHTML.style = "position: absolute; z-index: 999999; background-color: rgb(89, 182, 194,0.3); width: 100%; height: 100%; z-index : 10000;";
var highlightHTMLText = document.createElement('DIV');
highlightHTMLText.style = "position: relative; text-align: center; font-size: 40px;  top: 50%; z-index : 10001;";
highlightHTMLText.textContent = "This Video";
VideoOverlayHTML.appendChild(highlightHTMLText);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.message){console.log("Received message: " + request.message);}

    if (request.message === 'DetectVideoPlayers') {  
        var _videoPlayers = DetectVideoPlayers();
        sendResponse({videoPlayers:_videoPlayers});
        return true;
    }else if (request.message === 'AddSubtitles') {        
        AddSubtitles();
        sendResponse();
        return true;
    }else if (request.message === 'RemoveSubtitles') {        
        RemoveSubtitles();
        sendResponse();
        return true;
    }else if (request.message === 'SearchSubtitles') {        
        SearchSubtitles(request.searchQuery);
        return true;
    }else if (request.message === 'MouseEnterVideoPlayer') {
        videoPlayers[request.index].parentElement.style = "height : 100%;";
        videoPlayers[request.index].parentElement.appendChild(VideoOverlayHTML);
        sendResponse();
        return true;
    }else if (request.message === 'MouseLeaveVideoPlayer') { 
        VideoOverlayHTML.parentElement.removeChild(VideoOverlayHTML);
        sendResponse();
        return true;
    }else if (request.message === 'SelectVideoPlayer') {
        sendResponse();
        return true;
    }else {
        console.log("Unknown message: " + request.message);
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

async function AddSubtitles() {
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
    console.log(`Searching Subtitles: `+ searchQuery);
    
    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': apiKey}};

    fetch(`https://api.opensubtitles.com/api/v1/subtitles?query=${searchQuery.replaceAll(" ","+")}`, options)//&order_by=test&order_direction=desc
    .then(response => response.json())
    .then(response => {
        console.log(response); 
        var movieName = response.data[0].attributes.feature_details.movie_name;
        console.log(`First result movie: ${movieName}`); 
        if(subTitleHTML){
            subTitleHTML.innerHTML = movieName;
        }
    }).catch(err => console.error(err));

    
}

