var VideoPlayers = [];
var SelectedVideo;
var SubTitleHTML;
var LastState = "None";
var CurrentState;
var ApiKey = "FSyoIs4NDWMD65l1eIoL6llyiOwdVv2d";

//Search input nodes
var LanguageSelect;
var HearingImpaired;
var ForeignPartsOnly;
var SeasonNumber;
var EpisodeNumber;
var ImportSubtitlesButton;
var SubtitlesHTML;

var SubtitlesData = [];//array of subtitles: {startTime,endTime,subtitle}[]
var CurrentSubtitleIndex;
var LastVideoTimestamp;

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
        var CloseOverlayButton = VideoOverlayHTML.querySelector("#CloseOverlay");
        CloseOverlayButton.addEventListener("click", function() {
            SetOverlayState("None")
        });


        //Search Tab
        var SearchSubtitlesButton = VideoOverlayHTML.querySelector("#SearchSubtitlesButton");
        SearchSubtitlesButton.addEventListener("click", function() {
            SearchSubtitles();
        });
        LanguageSelect = VideoOverlayHTML.querySelector("#LanguageSelect");
        HearingImpaired = VideoOverlayHTML.querySelector("#HearingImpaired");
        ForeignPartsOnly = VideoOverlayHTML.querySelector("#ForeignPartsOnly");
        SeasonNumber = VideoOverlayHTML.querySelector("#SeasonNumber");
        EpisodeNumber = VideoOverlayHTML.querySelector("#EpisodeNumber");
        ImportSubtitlesButton = VideoOverlayHTML.querySelector("#ImportSubtitles");
        SubtitlesHTML = VideoOverlayHTML.querySelector("#Subtitles");
        HearingImpaired.addEventListener("click", function() {
            if(HearingImpaired.checked) ForeignPartsOnly.checked = false;
        });
        ForeignPartsOnly.addEventListener("click", function() {
            if(ForeignPartsOnly.checked) HearingImpaired.checked = false;
        });
        ImportSubtitlesButton.addEventListener("change", function() {
            console.log("Import Changed");
            ImportSubtitle();
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
    VideoPlayers = [];
    let videoPlayerTexts = [];
    document.querySelectorAll('video').forEach(video => {
        if(video.src) {
            VideoPlayers.push(video);
            videoPlayerTexts.push(video.src);
        }
    });
    return videoPlayerTexts;
}

function MouseEnterVideoPlayer(index) {
    SetOverlayState("Highlight")
    //videoPlayers[index].parentElement.style = "height : 100%;"; //make sure parent has height (youtube doesnt)
    ParentOverlay(VideoPlayers[index]);
}
function MouseLeaveVideoPlayer() {
    VideoOverlayHTML.parentElement.removeChild(VideoOverlayHTML);

    if(SelectedVideo){
        if(CurrentState==="Highlight")SetOverlayState(LastState);
        else SetOverlayState(CurrentState);
        ParentOverlay(SelectedVideo);
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
    SelectedVideo = VideoPlayers[index];
    SetOverlayState("SearchSubtitles")
}
function SetOverlayState(state) {
    LastState = CurrentState;
    //TODO not query but cache?
    VideoOverlayHTML.querySelector('#VideoHighlight').hidden = (state !== 'Highlight');
    VideoOverlayHTML.querySelector('#SearchSubtitlesOverlay').hidden = (state !== 'SearchSubtitles');
    SubtitlesHTML.hidden = (state !== 'Subtitles');
    CurrentState = state;
}


function SearchSubtitles(searchQuery) {
    var searchQuery = VideoOverlayHTML.querySelector("#SearchSubtitlesInput").value.replaceAll(' ','+');
    console.log(`Searching Subtitles: `+ searchQuery);
    

    /*
    API PARAMETERS ORDER:
    episode_number      integer
    foreign_parts_only  string          exclude, include, only (default: include)
    hearing_impaired    string          include, exclude, only. (default: include)
    languages           string          Language code(s), coma separated (en,fr)
    order_by            string              See https://opensubtitles.stoplight.io/docs/opensubtitles-api/a172317bd5ccc-search-for-subtitles
    order_direction     string          asc,desc
    query               string
    season_number       integer
    */

    const urlParams = new URLSearchParams();
    if(EpisodeNumber.value) {urlParams.append("episode_number",EpisodeNumber.value)}
    if(ForeignPartsOnly.checked) {urlParams.append("foreign_parts_only","only")} else {urlParams.append("foreign_parts_only","exclude")}
    if(HearingImpaired.checked) {urlParams.append("hearing_impaired","only")} else {urlParams.append("hearing_impaired","exclude")}
    urlParams.append("languages",LanguageSelect.value);
    urlParams.append("query",searchQuery);
    if(SeasonNumber.value) {urlParams.append("season_number",SeasonNumber.value)}

    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': ApiKey}, mode: 'cors',};
    const url = `https://api.opensubtitles.com/api/v1/subtitles?${urlParams.toString()}`;
    console.log(`Getting Subtitles, api url: ${url}`);
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
            subtitleResultListItem.className  = "SubtitleResultListItem";
            subtitleResultListItem.innerHTML = response.data[i].attributes.feature_details.movie_name;
            SearchSubtitlesResultsContainer.appendChild(subtitleResultListItem);
            subtitleResultListItem.addEventListener("click", function() {
                console.log(`Clicked [${i}] movie: ${response.data[i].attributes.feature_details.movie_name}`); 
            });
            SearchSubtitlesResultsContainer.appendChild(document.createElement('br'));
        }

        var movieName = response.data[0].attributes.feature_details.movie_name;
        console.log(`First result movie: ${movieName}`); 
        if(SubTitleHTML){
            SubTitleHTML.innerHTML = movieName;
        }
    }).catch(err => console.error(err));

    
}

function ImportSubtitle(){
    var SubtitleFile = ImportSubtitlesButton.files[0];
    console.log(SubtitleFile);

    var reader = new FileReader();
    reader.onload = function(e){
        //console.log(e.target.result);
        ParseSubtitle(e.target.result)
    }
    reader.readAsText(SubtitleFile);
}

function DownloadSubtitle(){
    //TODO smart caching stuff
}

//srt file contents as string
function ParseSubtitle(allSubtitles){
    SubtitlesData = [];
    var lines = allSubtitles.split(/\r?\n/);
    var i = 0;

    var subTitle = {};
    while(i<lines.length){
        
        if(!lines[i]){//empty line
            if(!(subTitle && Object.keys(subTitle).length === 0 && subTitle.constructor === Object)) {//thorough check if empty
                SubtitlesData.push(subTitle);
            }
            i++
        }else if(!isNaN(lines[i])){//new index
            subTitle = {};//new subtitle object
            i++
        }else if(lines[i].includes("-->")){//timestamp
            var split = lines[i].split("-->");
            subTitle.startTime = ParseTimeStamp(split[0]);
            subTitle.endTime = ParseTimeStamp(split[1]);
            i++
        }else {
            if(subTitle.content){
                subTitle.content += "<br>"+lines[i];
            }else{
                subTitle.content = lines[i];
            }
            i++
        }
    }
    console.log(SubtitlesData);
    AddSubtitles();
    UpdateSubtitles();
    SetOverlayState("Subtitles");
}

function ParseTimeStamp(t){
    //Format = 00:02:04,743 to seconds as number
    return Number(t.split(':')[0]) * 60 * 60 + //hours
            Number(t.split(':')[1]) * 60 + //minutes
            Number(t.split(':')[2].split(',')[0]) + //seconds
            Number(t.split(',')[1]) * 0.001; //miliseconds
}


function AddSubtitles() {
    console.log(`Adding Subtitles`);
    RemoveSubtitles(); 

    if(SelectedVideo){   
        SelectedVideo.parentElement.parentElement.appendChild(SubtitlesHTML);
    }
}
function RemoveSubtitles() {
    if(SubtitlesHTML){
        SubtitlesHTML.parentElement.removeChild(SubtitlesHTML);
    }
}
function UpdateSubtitles() {
    if(!SelectedVideo){return;}
    var t = SelectedVideo.currentTime;
    var sub = SubtitlesData.find(item=> item.startTime>=t && t<=item.endTime)
    console.log(`Subtitle at ${t}: ${sub.content}`);
    SubtitlesHTML.innerHTML = sub.content;
}