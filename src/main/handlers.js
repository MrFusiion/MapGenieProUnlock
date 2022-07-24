const waitForDomLoaded = require("../shared/waitForDomLoaded");
const { isList, isMap, isGuide } = require("../page/site");


function error(message) {
    window.postMessage({ type: "mg:error", message }, "*");
}

function get_status(sendResponse) {
    waitForDomLoaded().then(() => {
        sendResponse({
            is_list:    isList(),
            is_map:     isMap(),
            is_guide:   isGuide(),
        });
    });
    return true;
}

function reload_window(sendResponse) {
    window.location.reload();
    sendResponse();
    return true;
}

function export_mapdata(sendResponse) {
    let gameid = sessionStorage.getItem("gameid");
    let userid = sessionStorage.getItem("userid");
    if (!gameid || !userid) return;

    let mapData = JSON.parse(window.localStorage.getItem(`mg:game_${gameid}:user_${userid}`) || null);
    if (!mapData) return error("No map data found");

    let blob = new Blob([JSON.stringify({
        gameid: gameid,
        userid: userid,
        mapdata: mapData,
    })], { type: "text/plain;charset=utf-8" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = `mg:game_${gameid}:user_${userid}_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);

    return false;
}

function import_mapdata(sendResponse) {
    let gameid = sessionStorage.getItem("gameid");
    let userid = sessionStorage.getItem("userid");
    if (!gameid || !userid) return;

    var filebrowser = document.createElement("input");
    filebrowser.type = "file";
    filebrowser.click();

    filebrowser.onchange = () => {
        let file = filebrowser.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            let data;
            try {
                data = JSON.parse(e.target.result || null) || {};
            } catch (e) {
                return error(`Invalid JSON file: ${e}`);
            }
            if (typeof data !== "object") return error("json has no valid data");
            if (data.gameid !== gameid) return error("json file is not for this game");
            if (data.userid !== userid) return error("json file is not for this user");
            if (!data.mapdata) return error("json file does not contain map data");

            //TODO validate data;
            window.localStorage.setItem(`mg:game_${gameid}:user_${userid}`, JSON.stringify(data.mapdata));
            window.dispatchEvent(new CustomEvent("mg:mapdata_changed"));
            filebrowser.remove();
        }
        reader.readAsText(file);
    };

    return false;
}

function clear_mapdata(sendResponse) {
    let game_title = sessionStorage.getItem("game_title");
    let ans = confirm(`Are you sure you want to clear your map data for game ${game_title}?`);
    if (!ans) return;

    let gameid = sessionStorage.getItem("gameid");
    let userid = sessionStorage.getItem("userid");
    if (!gameid || !userid) return;

    window.localStorage.removeItem(`mg:game_${gameid}:user_${userid}`);
    window.dispatchEvent(new CustomEvent("mg:mapdata_changed"));
    return false
}

module.exports = { get_status, reload_window, export_mapdata, import_mapdata, clear_mapdata };