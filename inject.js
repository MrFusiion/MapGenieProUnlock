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
        IS_LIST     = window.location.href === "https://mapgenie.io/";
        IS_MAP      = !!document.querySelector(".map > #app > #map");
        IS_GUIDE    = !!document.querySelector(".guide > #app #sticky-map");

        if (IS_LIST || IS_MAP || IS_GUIDE) {
            for (let selector of Object.values(HIDE_ELEMET_SELECTORS)) {
                for (let element of document.querySelectorAll(selector))
                    element.style.display = "none";
            }

            injectStyle("page/style.css");
            injectCode("page/main.js").then(() => {
                if (IS_MAP || IS_GUIDE) injectCode("page/map.js", true);
                if (IS_GUIDE) injectCode("page/guide.js", true);
                if (IS_LIST) {
                    injectStyle("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css");
                    injectCode("page/list.js", true);
                }
            });
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

        return false;
    } else if (request.action === "import_mapdata") {

        return false;
    }
});