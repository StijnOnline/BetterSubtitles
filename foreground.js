

var ApiKey = "FSyoIs4NDWMD65l1eIoL6llyiOwdVv2d";


var VideoPlayers = [];
var SelectedVideo;
var SubTitleHTML;
var LastState = "None";
var CurrentState;

//Search input nodes
var LanguageSelect;
var HearingImpaired;
var ForeignPartsOnly;
var SeasonNumber;
var EpisodeNumber;
var ImportSubtitlesButton;
var SubtitleResultListItem;
var SubtitlesHTML;

var SyncSubtitles;
var SyncSubtitles_TimeLine;
var SyncSubtitles_ScrollView;
var SyncSubtitles_Subs;
var SyncSubtitles_Item;
var SyncSubtitles_ArrowMarker;
var SyncSubtitles_TimeToPixelRatio = 25;
var SubtitlesSync_TimeOffset = 0;

var SubtitlesData = [];//array of subtitles: {startTime,endTime,content}[]
var CurrentSubtitleIndex = 0;
var LastVideoTimestamp = 0;

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
            //SearchFeatures();
        });
        LanguageSelect = VideoOverlayHTML.querySelector("#LanguageSelect");
        HearingImpaired = VideoOverlayHTML.querySelector("#HearingImpaired");
        ForeignPartsOnly = VideoOverlayHTML.querySelector("#ForeignPartsOnly");
        SeasonNumber = VideoOverlayHTML.querySelector("#SeasonNumber");
        EpisodeNumber = VideoOverlayHTML.querySelector("#EpisodeNumber");
        ImportSubtitlesButton = VideoOverlayHTML.querySelector("#ImportSubtitles");
        SubtitlesHTML = VideoOverlayHTML.querySelector("#Subtitles");
        SubtitleResultListItem = VideoOverlayHTML.querySelector(".SubtitleResultListItem");
        VideoOverlayHTML.querySelector("#SearchSubtitlesResultsContainer").removeChild(SubtitleResultListItem);

        SyncSubtitles = VideoOverlayHTML.querySelector("#SyncSubtitles");
        SyncSubtitles_TimeLine = VideoOverlayHTML.querySelector("#SyncSubtitles_TimeLine");
        SyncSubtitles_Subs = VideoOverlayHTML.querySelector("#SyncSubtitles_Subs");
        SyncSubtitles_Item = VideoOverlayHTML.querySelector(".SyncSubtitles_SubtitleItem");
        SyncSubtitles_Subs.removeChild(SyncSubtitles_Item);//remove template item
        SyncSubtitles_ArrowMarker = VideoOverlayHTML.querySelector("#SyncSubtitles_TimeMarkerArrow");


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




        
        SyncSubtitles_ScrollView = VideoOverlayHTML.querySelector('#SyncSubtitles_Subs');
        let mouseDown = false;
        let startY=0, scrollTop=0, totalScroll=0;

        let startDragging = function (e) {
            mouseDown = true;
            startY = e.pageY - SyncSubtitles_ScrollView.offsetTop;
            scrollTop = SyncSubtitles_ScrollView.scrollTop;
        };
        let stopDragging = function (event) {
            if(mouseDown) {
                SubtitlesSync_TimeOffset += -totalScroll / SyncSubtitles_TimeToPixelRatio;
                console.log(`Adjusting Sync by ${-totalScroll / SyncSubtitles_TimeToPixelRatio}, now ${SubtitlesSync_TimeOffset}`); 
            }
            mouseDown = false;
            totalScroll=0;
        };

        SyncSubtitles_ScrollView.addEventListener('mousemove', (e) => {
            e.preventDefault();
            if(!mouseDown) { return; }
            const y = e.pageY - SyncSubtitles_ScrollView.offsetTop;
            const scroll = y - startY;
            totalScroll = scroll;
            SyncSubtitles_ScrollView.scrollTop = scrollTop - scroll;
        });

        // Add the event listeners
        SyncSubtitles_ScrollView.addEventListener('mousedown', startDragging, false);
        SyncSubtitles_ScrollView.addEventListener('mouseup', stopDragging, false);
        SyncSubtitles_ScrollView.addEventListener('mouseleave', stopDragging, false);
        SyncSubtitles_ScrollView.addEventListener('mousewheel', MouseWheelHandler, false);

        //Disable Normal scroll
        function MouseWheelHandler(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        
        
        VideoOverlayHTML.querySelector("#SyncSubtitles_DoneButton").addEventListener("click", function() {
            SetOverlayState("Subtitles");
        });
        
        AddLanguageOptions(VideoOverlayHTML.querySelector("#LanguageSelect"));
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
    }else if (request.message === 'SyncSubtitles') {
        SetOverlayState("SyncSubtitles");
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
    VideoOverlayHTML.querySelector('#SyncSubtitles').hidden = (state !== 'SyncSubtitles');
    SubtitlesHTML.hidden = (state !== 'Subtitles');
    if(SelectedVideo) {
        SelectedVideo.removeEventListener("timeupdate",UpdateSubtitles);
        SelectedVideo.removeEventListener("timeupdate",UpdateSyncMode);
        if(state === 'Subtitles'){
            SelectedVideo.addEventListener("timeupdate",UpdateSubtitles);
        }if(state === 'SyncSubtitles'){
            SelectedVideo.addEventListener("timeupdate",UpdateSyncMode);
        }
    };
    if(state === 'SyncSubtitles') {
        InitSyncMode();
    };

    CurrentState = state;
}


function SearchSubtitles(searchQuery) {
    var searchQuery = VideoOverlayHTML.querySelector("#SearchSubtitlesInput").value.replaceAll(' ','+').toLowerCase();;
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
            var _subtitleResultListItem = SubtitleResultListItem.cloneNode(true);
            SearchSubtitlesResultsContainer.appendChild(_subtitleResultListItem);

            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Title").innerHTML = response.data[i].attributes.feature_details.title;
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_FullName").innerHTML = "(" + response.data[i].attributes.release + ")";
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Downloads").innerHTML = response.data[i].attributes.download_count;
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_TrustedUserIcon").style = response.data[i].attributes.from_trusted===true ? "" : "filter: opacity(0.15);";
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_AITranslatedIcon").style = response.data[i].attributes.ai_translated===true? "" : "filter: opacity(0.15);";

            _subtitleResultListItem.addEventListener("click", function() {
                console.log(`Clicked [${i}] movie: ${response.data[i].attributes.feature_details.title}`); 
                GetSubtitle(response.data[i]);
            });
            SearchSubtitlesResultsContainer.appendChild(document.createElement('br'));
        }
    }).catch(err => console.error(err));

    
    var SearchSubtitlesResultsContainer = document.querySelector("#SearchSubtitlesResultsContainer");
    SearchSubtitlesResultsContainer.innerHTML = '';//remove all content
}

/*
function SearchFeatures(searchQuery) {
    var input = VideoOverlayHTML.querySelector("#SearchSubtitlesInput").value;
    var searchQuery = input.replaceAll(' ','+').toLowerCase();
    console.log(`Searching Features: `+ searchQuery);
    


    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': ApiKey}, mode: 'cors',};
    const url = `https://api.opensubtitles.com/api/v1/features?query=${searchQuery}`;

    console.log(`Getting Features, api url: ${url}`);
    fetch(url, options)
    .then(response => response.json())
    .then(response => {
        console.log(response); 

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
            //if(response.data[i].attributes.feature_type === "Episode") continue;
            //if(!response.data[i].attributes.subtitles_counts[LanguageSelect.value]) continue;
            var _subtitleResultListItem = SubtitleResultListItem.cloneNode(true);
            SearchSubtitlesResultsContainer.appendChild(_subtitleResultListItem);

            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Title").innerHTML = response.data[i].attributes.title;
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_FullName").innerHTML = "()";
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Downloads").innerHTML = response.data[i].attributes.subtitles_counts[LanguageSelect.value];
            //_subtitleResultListItem.querySelector(".SubtitleResultListItem_TrustedUserIcon").style = response.data[i].attributes.from_trusted===true ? "" : "filter: opacity(0.15);";
            //_subtitleResultListItem.querySelector(".SubtitleResultListItem_AITranslatedIcon").style = response.data[i].attributes.ai_translated===true? "" : "filter: opacity(0.15);";

            _subtitleResultListItem.addEventListener("click", function() {
                console.log(`Clicked [${i}] movie: ${response.data[i].attributes.title}`); 
            });
            SearchSubtitlesResultsContainer.appendChild(document.createElement('br'));
        }
    }).catch(err => console.error(err));

    var SearchSubtitlesResultsContainer = document.querySelector("#SearchSubtitlesResultsContainer");
    SearchSubtitlesResultsContainer.innerHTML = '';//remove all content
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

//srt file contents as string
function ParseSubtitle(allSubtitles){
    console.log("Parsing Subtitle");
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
    SetOverlayState("SyncSubtitles");
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



//var subIndex = SubtitlesData.findIndex(item=> item.startTime>=t && t<=item.endTime);
function UpdateSubtitles() {
    if(!SelectedVideo){return;}
    var sub = null;
    var t = SelectedVideo.currentTime + SubtitlesSync_TimeOffset;

    //if new time is less than 2min later than last sub, just search forward
    if(t > LastVideoTimestamp && (t - LastVideoTimestamp) < 120){ 
        var subIndex = CurrentSubtitleIndex;
        while(subIndex < SubtitlesData.length){
            var item = SubtitlesData[subIndex]
            if(t>=item.startTime && t<=item.endTime){
                CurrentSubtitleIndex = subIndex;
                sub = SubtitlesData[subIndex];
                break;
            }
            subIndex++;
        }
    }
    
    //if new time is less than 2min earlier than last sub, just search backward
    else if(t < LastVideoTimestamp && (LastVideoTimestamp - t) < 120){
        var subIndex = CurrentSubtitleIndex;
        while(subIndex > 0){
            var item = SubtitlesData[subIndex]
            if(t>=item.startTime && t<=item.endTime){
                CurrentSubtitleIndex = subIndex;
                sub = SubtitlesData[subIndex];
                break;
            }
            subIndex--;
        }
    }

    //else its more effecient to use binary search (because array is sorted)
    else{
        var result;
        if(t > LastVideoTimestamp){
            result = BinarySearchSubtitles(t,CurrentSubtitleIndex,SubtitlesData.length-1);
        }else if(t < LastVideoTimestamp && CurrentSubtitleIndex !== 0){
            result = BinarySearchSubtitles(t,0,CurrentSubtitleIndex);
        }else {
            result = BinarySearchSubtitles(t,0,SubtitlesData.length-1);
        }
        //console.log(`Binary search ${t} result:`);
        //console.log(result);
        if(result){
            if(result.found){
                sub = SubtitlesData[subIndex];
            }
            if(result.index){
                CurrentSubtitleIndex = result.index;
            }
        }
    }

    LastVideoTimestamp = t;

    if(sub){
        SubtitlesHTML.innerHTML = sub.content;
        //console.log(`Subtitle at ${t}: ${sub.content}`);
    }else{
        SubtitlesHTML.innerHTML = "";
        //console.log(`No sub at ${t}`);
    }
}

//https://www.geeksforgeeks.org/binary-search-in-javascript/
function BinarySearchSubtitles(t, start, end){         
    // Iterate while start not meets end
    var mid;
    while (start<=end){
 
        // Find the mid index
        mid=Math.floor((start + end)/2);
  
        // If element is present at mid, return True
        if (t>=SubtitlesData[mid].startTime && t<=SubtitlesData[mid].endTime) return {found:true, index: mid};
 
        // Else look in left or right half accordingly
        else if (SubtitlesData[mid].startTime < t)
             start = mid + 1;
        else
             end = mid - 1;
    }
  
    return {found:false, index: mid};
}

function GetSubtitle(subtitleData){
    if(!subtitleData || !subtitleData.id) return;
    if(subtitleData.id === -1) return; //used when imported file
    const g = `${subtitleData.id}`;
    chrome.storage.local.get(g).then(
        (result) => {
            if(result && result[subtitleData.id] && result[subtitleData.id].subtitles && result[subtitleData.id].subtitles.length > 0){
                console.log(`Loaded Subtitle from cache, id: ${subtitleData.id}`);
                console.log(result[subtitleData.id]);
                SubtitlesData = result[subtitleData.id].subtitles;
                AddSubtitles();
                UpdateSubtitles();
                SetOverlayState("Subtitles");
            }else{
                console.log(`Failed to load Subtitle from cache, id: ${subtitleData.id}`);
                DownloadRequestSubtitle(subtitleData);
            }
        }
    );
}

function DownloadRequestSubtitle(subtitleData){
    console.log(`Download Request subtitle id: ${subtitleData.id}, file id: ${subtitleData.attributes.files[0].file_id}`);

    const url = 'https://api.opensubtitles.com/api/v1/download';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': ApiKey
        },
        body: '{"file_id":'+ subtitleData.attributes.files[0].file_id + ',"sub_format":"srt"}'
    };
    
    console.log(`Download Request, api url: ${url}`);
    fetch(url, options)
    .then(response => response.json())
    .then(response => {
        console.log(response); 
        console.log("Download Request Succesful, remaining requests:" +response.remaining); 

        DownloadSubtitle(subtitleData,response.link);
        
        
    }).catch(err => console.error(err));

}
function DownloadSubtitle(subtitleData, downloadUrl){
    console.log(`Downloading ${downloadUrl}`);

    const options = {method: 'GET'};

    fetch(downloadUrl, options)
    .then(response => response.text())
    .then(response => {
        console.log("Download Succesful"); 
        //console.log(response);
        ParseSubtitle(response);
        CacheSubtitle(subtitleData);        
    }).catch(err => console.error(err));
}

function CacheSubtitle(subtitleData){    
    if(!subtitleData || !subtitleData.id) return;
    if(subtitleData.id === -1) return; //used when imported file

    const keyvalue = {};
    keyvalue[subtitleData.id] = {title : subtitleData.attributes.feature_details.title , subtitles : SubtitlesData };
    
    chrome.storage.local.set(keyvalue).then(() => {
        console.log(`Cached subtitles with id: ${subtitleData.id}`);
    });
}
















function InitSyncMode(){    
    //Populate Subs in timeline view
    SyncSubtitles_Subs.innerHTML = '';//remove all content
    if(!SubtitlesData || SubtitlesData.length == 0){
        var SomethingWentWrong = document.createElement('p');
        SomethingWentWrong.innerHTML = "Something went wrong";

        SyncSubtitles_Subs.appendChild(SomethingWentWrong);
        return;
    }


    //Add Start element
    {
        var _SubtitleItem = SyncSubtitles_Item.cloneNode(true);
        _SubtitleItem.querySelector(".SyncSubtitles_SubtitleText").innerText = "<<Start>>";
        var endPos = SelectedVideo.duration * SyncSubtitles_TimeToPixelRatio;
        _SubtitleItem.style = `top: 0px; height: 0; padding-top: 50px; background-color: transparent;`;       
        SyncSubtitles_Subs.appendChild(_SubtitleItem);        
    }
    var arrowPos = SyncSubtitles_ArrowMarker.getBoundingClientRect();
    for (let i = 0; i < SubtitlesData.length; i++) {
        var _SubtitleItem = SyncSubtitles_Item.cloneNode(true);
        
        _SubtitleItem.querySelector(".SyncSubtitles_SubtitleText").innerHTML = SubtitlesData[i].content;

        var pos = SyncSubtitles_TimeToPixelRatio * SubtitlesData[i].startTime;
        //account for arrow marker as 0point 
        pos += arrowPos.y + arrowPos.height / 2;

        _SubtitleItem.style = `top:${pos}px; height:${SyncSubtitles_TimeToPixelRatio * (SubtitlesData[i].endTime - SubtitlesData[i].startTime)}px;`;
        
        SyncSubtitles_Subs.appendChild(_SubtitleItem);
    }

    //Add End element
    {
        var _SubtitleItem = SyncSubtitles_Item.cloneNode(true);
        _SubtitleItem.querySelector(".SyncSubtitles_SubtitleText").innerText  = "<<END>>";
        var endPos = SelectedVideo.duration * SyncSubtitles_TimeToPixelRatio;
        _SubtitleItem.style = `top: ${endPos}px; height: 0; padding-bottom: 50px; background-color: transparent;`;       
        SyncSubtitles_Subs.appendChild(_SubtitleItem);        
    }

    
    var t = SelectedVideo.currentTime;
    SyncSubtitles.querySelector("#SyncSubtitles_TimeText").innerHTML = new Date(t * 1000).toISOString().slice(11, 23);

    

    UpdateSyncMode();
}

function UpdateSyncMode(){   
    var t = SelectedVideo.currentTime;
    SyncSubtitles.querySelector("#SyncSubtitles_TimeText").innerHTML = new Date(t * 1000).toISOString().slice(11, 23);
    
    
    var ypos = (t + SubtitlesSync_TimeOffset) * SyncSubtitles_TimeToPixelRatio;
    SyncSubtitles_ScrollView.scrollTop = ypos;
    

function AddLanguageOptions(element){

    fetch(chrome.runtime.getURL("Data/LanguageOptions.html"))
    .then(response=> response.text())
    .then(response=> {
        var options = response
        
        options = '<option value="en">English</option>' + '<option disabled>--------</option>' + options;
        element.innerHTML = options;
        
        //detect language and add to quick options
        var userLanguage = window.navigator.language;
        //other api: 
        //chrome.i18n.getAcceptLanguages()
        //chrome.i18n.getUILanguage()
        if(userLanguage != 'en'){
            console.log("detected language: " + userLanguage);
            var quickAccess = element.querySelector('option[value="' + userLanguage  +'"]');
            if(quickAccess) element.prepend(quickAccess.cloneNode(true));
        }
        
        
    });
}