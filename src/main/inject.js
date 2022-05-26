const { isList, isMap, isGuide } = require("../page/site");
let HIDE_ELEMET_SELECTORS = [
    "#blobby-left", ".upgrade", ".progress-buttons ~ .inset",               // map
    "#button-upgrade", "p ~ h5 ~ p ~ h4 ~ blockquote", "p ~ h5 ~ p ~ h4"    // guide
];


function getURL(url) {
    if (url.startsWith("https://") || url.startsWith("http://")) {
        return url;
    }
    return chrome.runtime.getURL(url);
}


function domLoaded(f) {
    if (document.readyState === "complete") {
        f();
    } else {
        let handle = setInterval(() => {
            if (document.readyState === "complete") {
                clearInterval(handle);
                f();
            }
        }, 100);
    }
}


function injectCode(src, defered = false, module = false) {
    return new Promise(resolve => {
        let script = document.createElement("script");
        script.src = getURL(src);
        script.onload = function () { this.remove(); resolve(); };
        script.defer = defered;
        script.type = module && "module" || "application/javascript";
        (document.head||document).append(script);
    });
}

function injectStyle(href) {
    return new Promise(resolve => {
        let style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = getURL(href);
        style.onload = function () { resolve(); };
        (document.head||document).append(style);
    });
}


function error(message) {
    window.postMessage({ type: "mg:error", message }, "*");
}


fetch(chrome.runtime.getURL("ui/options.json"))
    .then(response => response.json())
    .then((options) => {
        chrome.storage.sync.get(["config"], data => {
            let config = data.config || {};
            for (let option of options) {
                config[option.name] = config.hasOwnProperty(option.name) ? config[option.name] : option.default;
            }
            chrome.storage.sync.set({ config });
        });
    })


let IS_LIST, IS_MAP, IS_GUIDE;
chrome.storage.sync.get(["config"], async (data) => {
    let config = data.config;
    if (!config.extension_enabled) {
        IS_LIST = IS_MAP = IS_GUIDE = false;
        return;
    };

    domLoaded(function () {
        IS_LIST = isList();
        IS_MAP = isMap();
        IS_GUIDE = isGuide();
        
        if (IS_LIST || IS_MAP || IS_GUIDE) {
            for (let selector of Object.values(HIDE_ELEMET_SELECTORS)) {
                for (let element of document.querySelectorAll(selector))
                    element.style.display = "none";
            }

            injectStyle("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css");
            injectStyle("page.css");
            injectCode("page.js");
        }
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "get_status") {
        let handle = setInterval(() => {
            if (typeof IS_LIST !== "undefined" && typeof IS_MAP !== "undefined" && typeof IS_GUIDE !== "undefined") {
                clearInterval(handle);
                sendResponse({
                    is_list : IS_LIST,
                    is_map  : IS_MAP,
                    is_guide: IS_GUIDE,
                });
            }
        });
        return true;
    } else if (request.action === "reload_window") {
        window.location.reload();
        sendResponse();
        return true;
    } else if (request.action === "export_mapdata") {
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
    } else if (request.action === "import_mapdata") {
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
                console.log(data);
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
    } else if (request.action === "clear_mapdata") {
        let game_title = sessionStorage.getItem("game_title");
        let ans = confirm(`Are you sure you want to clear your map data for game ${game_title}?`);
        if (!ans) return;

        let gameid = sessionStorage.getItem("gameid");
        let userid = sessionStorage.getItem("userid");
        if (!gameid || !userid) return;

        window.localStorage.removeItem(`mg:game_${gameid}:user_${userid}`);
        window.dispatchEvent(new CustomEvent("mg:mapdata_changed"));
    }
});