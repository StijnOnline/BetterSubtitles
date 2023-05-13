console.log("BetterSubtitles Foreground Script Loaded");

var ApiKey = "FSyoIs4NDWMD65l1eIoL6llyiOwdVv2d";


var VideoPlayers = [];
var SelectedVideo;
var SubTitleHTML;
var LastState = "None";
var CurrentState;

//Search input nodes
var IsSeriesToggle;
var SearchSubtitlesInput;
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
        SearchSubtitlesInput = VideoOverlayHTML.querySelector("#SearchSubtitlesInput");
        SearchSubtitlesInput.addEventListener("keydown",function(e){
            //if(e.keyCode == 13) SearchFeatures();
            autocompletedFeatureID=null;
            SearchSubtitlesInput.classList.remove('linked');
        });
        CreateAutocomplete(SearchSubtitlesInput,GetAutocompleteOptions);
        
        var SearchSubtitlesButton = VideoOverlayHTML.querySelector("#SearchSubtitlesButton");
        SearchSubtitlesButton.addEventListener("click", function() {
            SearchSubtitles();
            //SearchFeatures();
        });
        var SubtitleTypeSelect = VideoOverlayHTML.querySelector("#SubtitleTypeButton");
        IsSeriesToggle = VideoOverlayHTML.querySelector("#SubtitleTypeButton input");
        SubtitleTypeSelect.addEventListener("click", function() {
            IsSeriesToggle.checked = !IsSeriesToggle.checked;
            SubtitleTypeSelect.querySelector("#MovieIcon").hidden = IsSeriesToggle.checked;
            SubtitleTypeSelect.querySelector("#SeriesIcon").hidden = !IsSeriesToggle.checked;
            if(IsSeriesToggle.checked){
                SubtitleTypeSelect.querySelector("#SubtitleTypeText").innerHTML = "Series";
            }else{
                SubtitleTypeSelect.querySelector("#SubtitleTypeText").innerHTML = "Movie";
            }

            VideoOverlayHTML.querySelector("#SeriesOptions").hidden = !IsSeriesToggle.checked;
        });
        SubtitleTypeSelect.click();
        SubtitleTypeSelect.click();

        LanguageSelect = VideoOverlayHTML.querySelector("#LanguageSelect");
        HearingImpaired = VideoOverlayHTML.querySelector("#HearingImpaired");
        ForeignPartsOnly = VideoOverlayHTML.querySelector("#ForeignPartsOnly");
        SeasonNumber = VideoOverlayHTML.querySelector("#SeasonNumber");
        EpisodeNumber = VideoOverlayHTML.querySelector("#EpisodeNumber");
        ImportSubtitlesButton = VideoOverlayHTML.querySelector("#ImportSubtitles");
        SubtitlesHTML = VideoOverlayHTML.querySelector("#Subtitles");
        SubtitleResultListItem = VideoOverlayHTML.querySelector(".SubtitleResultListItem");
        VideoOverlayHTML.querySelector("#SearchSubtitlesResultsContainer").removeChild(SubtitleResultListItem);
        AddLanguageOptions(VideoOverlayHTML.querySelector("#LanguageSelect"));
        LanguageSelect.addEventListener("change",SaveSearchOptions);
        HearingImpaired.addEventListener("change",SaveSearchOptions);
        ForeignPartsOnly.addEventListener("change",SaveSearchOptions);

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
                //console.log(`Adjusting Sync by ${-totalScroll / SyncSubtitles_TimeToPixelRatio}, now ${SubtitlesSync_TimeOffset}`); 
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

        //Normal scroll
        function MouseWheelHandler(e) {
            SubtitlesSync_TimeOffset += e.deltaY / SyncSubtitles_TimeToPixelRatio;
            //console.log(`Adjusting Sync by ${e.deltaY / SyncSubtitles_TimeToPixelRatio}, now ${SubtitlesSync_TimeOffset}`); 
            //e.preventDefault();
            e.stopPropagation();
            return false;
        }
        
        
        VideoOverlayHTML.querySelector("#SyncSubtitles_DoneButton").addEventListener("click", function() {
            SetOverlayState("Subtitles");
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
    var input = SearchSubtitlesInput.value;
    if(!input)return;
    var searchQuery = input.replaceAll(' ','+').toLowerCase();;
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
    if(IsSeriesToggle.checked && EpisodeNumber.value) {urlParams.append("episode_number",EpisodeNumber.value)}
    if(ForeignPartsOnly.checked) {urlParams.append("foreign_parts_only","only")} else {urlParams.append("foreign_parts_only","exclude")}
    if(HearingImpaired.checked) {urlParams.append("hearing_impaired","only")} else {urlParams.append("hearing_impaired","exclude")}
    if(autocompletedFeatureID && !IsSeriesToggle.checked) urlParams.append("id",autocompletedFeatureID);
    urlParams.append("languages",LanguageSelect.value);
    if(autocompletedFeatureID && IsSeriesToggle.checked) urlParams.append("parent_feature_id",autocompletedFeatureID);
    urlParams.append("query",searchQuery);
    if(IsSeriesToggle.checked && SeasonNumber.value) {urlParams.append("season_number",SeasonNumber.value)}
    urlParams.append("type",(IsSeriesToggle.checked ? "episode" : "movie"));

    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': ApiKey}, mode: 'cors',};
    const url = `https://api.opensubtitles.com/api/v1/subtitles?${urlParams.toString()}`;
    console.log(`Getting Subtitles, api url: ${url}`);
    fetch(url, options)
    .then(response => response.json())
    .then(response => {
        console.log(response); 
        if(!response || !response.data){
            var SomethingWentWrong = document.createElement('p');
            SomethingWentWrong.innerHTML = "Something went wrong";
            if(response.data.length == 0)
            SomethingWentWrong.innerHTML = "No Results";

            if(!response && response.errors){
                SomethingWentWrong.innerHTML = response.errors[0];
            }

            SearchSubtitlesResultsContainer.appendChild(SomethingWentWrong);
            return;
        }

        SubtitlesResults = [];
        //Add movies to list
        for (let i = 0; i < response.data.length; i++) {
            var _subtitleResultListItem = SubtitleResultListItem.cloneNode(true);
            SearchSubtitlesResultsContainer.appendChild(_subtitleResultListItem);

            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Title").innerHTML = response.data[i].attributes.feature_details.title;
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_FullName").innerHTML = "(" + response.data[i].attributes.release + ")";
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Downloads").innerHTML = response.data[i].attributes.download_count;
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_TrustedUserIcon").style = response.data[i].attributes.from_trusted===true ? "filter: invert(1);" : "filter: invert(1)opacity(0.25);";
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_AITranslatedIcon").style = response.data[i].attributes.ai_translated===true? "filter: invert(1);" : "filter: invert(1)opacity(0.25);";

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
                SetOverlayState("SyncSubtitles");
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
    
}












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
        
        LoadSearchOptions();        
    });
}

function SaveSearchOptions(){
    console.log("Saving Search Options");
    const keyvalue = {};
    keyvalue['SearchOptions'] = {Language : LanguageSelect.value , foreign_parts_only : ForeignPartsOnly.checked, hearing_impaired : HearingImpaired.checked, };
    
    chrome.storage.local.set(keyvalue);
}

function LoadSearchOptions(){
    chrome.storage.local.get('SearchOptions').then(
        (result) => {
            if(result && result.SearchOptions){
                if(result.SearchOptions.Language){
                    LanguageSelect.value = result.SearchOptions.Language;
                }
                if(result.SearchOptions.foreign_parts_only){
                    ForeignPartsOnly.checked = result.SearchOptions.foreign_parts_only;
                }
                if(result.SearchOptions.hearing_impaired){
                    HearingImpaired.checked = result.SearchOptions.hearing_impaired;                    
                }
            }
        }
    );
}

function PrintLocalStorage(){
    chrome.storage.local.get(null).then(
        (result) => {
            console.log(result);
        }
    );
}

var autocompletedFeatureID;

var lastGetAutocompleteRequest = 0;
var AutocompleteRequestDelay = 500;//ms
var AutocompleteMaxShowResuts = 10;
var lastAutoCompleteOptions;
var finishAutoCompleteTimoutID;
function GetAutocompleteOptions(){
    var a, val = this.value;
    /*close any already open lists of autocompleted values*/
    closeAutocompleteLists();
    if (!val) { return false;}
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);

    if(val.length >= 3){
        if((Date.now() - lastGetAutocompleteRequest > AutocompleteRequestDelay)){
            RequestAutoCompleteOptions(val);
        }else if(lastAutoCompleteOptions){
            AddAutoCompleteOptions(lastAutoCompleteOptions);
            //Run it automatically after delay, so if any input happened in that period it updates without needing additional input
            clearTimeout ( finishAutoCompleteTimoutID );
            finishAutoCompleteTimoutID = setTimeout (function() {RequestAutoCompleteOptions(val);}, AutocompleteRequestDelay );
        }
    }

    
    
}

function RequestAutoCompleteOptions(searchQuery) {
    lastGetAutocompleteRequest = Date.now();
    var input = SearchSubtitlesInput.value;
    var searchQuery = input.replaceAll(' ','+').toLowerCase();
    console.log(`Searching Features: `+ searchQuery);
    
    if(IsSeriesToggle.checked)searchQuery += '&type=tvshow';
    else searchQuery += '&type=movie';

    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': ApiKey}, mode: 'cors',};
    const url = `https://api.opensubtitles.com/api/v1/features?query=${searchQuery}`;

    console.log(`Getting Features, api url: ${url}`);
    fetch(url, options)
    .then(response => response.json())
    .then(response => {
        //console.log(response); 

        if(!response || !response.data){
            var SomethingWentWrong = document.createElement('p');
            SomethingWentWrong.innerHTML = "Something went wrong";
            if(response.data.length == 0)
            SomethingWentWrong.innerHTML = "No Results";

            if(!response && response.errors){
                SomethingWentWrong.innerHTML = response.errors[0];
            }

            SearchSubtitlesResultsContainer.appendChild(SomethingWentWrong);
            return;
        }

        AutocompleteResults = [];

        //Add movies to list
        for (let i = 0; i < response.data.length; i++) {
            if(response.data[i].attributes.feature_type === "Episode") continue;
            if(!response.data[i].attributes.subtitles_counts[LanguageSelect.value]) continue;
            //if(!response.data[i].attributes.subtitles_counts[LanguageSelect.value]) continue;
            var _subtitleResultListItem = SubtitleResultListItem.cloneNode(true);
            //SearchSubtitlesResultsContainer.appendChild(_subtitleResultListItem);
            
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Title").innerHTML = response.data[i].attributes.title;
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_FullName").innerHTML = "()";
            _subtitleResultListItem.querySelector(".SubtitleResultListItem_Downloads").innerHTML = response.data[i].attributes.subtitles_counts[LanguageSelect.value];
            //_subtitleResultListItem.querySelector(".SubtitleResultListItem_TrustedUserIcon").style = response.data[i].attributes.from_trusted===true ? "" : "filter: opacity(0.15);";
            //_subtitleResultListItem.querySelector(".SubtitleResultListItem_AITranslatedIcon").style = response.data[i].attributes.ai_translated===true? "" : "filter: opacity(0.15);";
            
            _subtitleResultListItem.addEventListener("click", function() {
                console.log(`Clicked [${i}] movie: ${response.data[i].attributes.title}`); 
            });
            //SearchSubtitlesResultsContainer.appendChild(document.createElement('br'));
            
            var subs = response.data[i].attributes.subtitles_counts[LanguageSelect.value];
            var longestMatchPercentage = longestCommonSubstring(input, response.data[i].attributes.title) / input.length;
            var levenshteinDistance = levenshtein(input,response.data[i].attributes.title);
            var matchingScore = Math.log2(subs) * 10 / (levenshteinDistance + 10) * longestMatchPercentage;
            AutocompleteResults.push(
                {matchingScore:matchingScore, longestMatch:longestMatchPercentage, levenshteinDistance:levenshteinDistance,subs:subs,data:response.data[i]}
            );
        }

        console.log(AutocompleteResults);

        var sorted = AutocompleteResults.sort((a, b) => (a.matchingScore < b.matchingScore ? 1 : -1));
        sorted.length = Math.min(sorted.length, AutocompleteMaxShowResuts);
        var sortedData = sorted.map(a => a.data);
        
        //console.log(sortedData);

        AddAutoCompleteOptions(sortedData);

    }).catch(err => console.error(err));
}

function AddAutoCompleteOptions(arr){
    lastAutoCompleteOptions = arr;
    var b, val = SearchSubtitlesInput.value;

    var container = document.getElementById(SearchSubtitlesInput.id + "autocomplete-list");
    container.innerHTML = ""; //Clear children

    /*for each item in the array...*/
    for (i = 0; i < arr.length; i++) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        var optionname = arr[i].attributes.title;
        b.innerHTML = optionname;
        //b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        //b.innerHTML += arr[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + i + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function(e) {
            /*insert the value for the autocomplete text field:*/
            //var data =this.getElementsByTagName("input")[0].value;
            var i = this.getElementsByTagName("input")[0].value;
            SearchSubtitlesInput.value = lastAutoCompleteOptions[i].attributes.title
            autocompletedFeatureID = lastAutoCompleteOptions[i].id;
            SearchSubtitlesInput.classList.add('linked');
            /*close the list of autocompleted values,
            (or any other open lists of autocompleted values:*/
            closeAutocompleteLists();
        });
        container.appendChild(b);
           
    }
}

function TestApi(url){
    const options = {method: 'GET', headers: {'Content-Type': 'application/json', 'Api-Key': ApiKey}, mode: 'cors',};
    console.log(`Getting Subtitles, api url: ${url}`);
    fetch(url, options)
    .then(response => response.json())
    .then(response => {
        console.log(response);
    }).catch(err => console.error(err));

}