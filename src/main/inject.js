const waitForDomLoaded = require("../shared/waitForDomLoaded");
const { isList, isMap, isGuide } = require("../page/site");
const { getStatus, reloadWindow, importMapData, exportMapData, clearMapData } = require("./handlers");
const { getSettings } = require("../shared/settings");


function getURL(url) {
    return (url.startsWith("https://") || url.startsWith("http://")) && url || chrome.runtime.getURL(url);
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

//Hide non-pro elements and inject map/guide hijacker code
getSettings().then((settings) => {
    waitForDomLoaded().then(() => {
        if (settings.extension_enabled && (isList() || isMap() || isGuide())) {

            //Hide non-pro elements
            for (let selector of Object.values([
                "#blobby-left", ".upgrade", ".progress-buttons ~ .inset",               // map
                "#button-upgrade", "p ~ h5 ~ p ~ h4 ~ blockquote", "p ~ h5 ~ p ~ h4"    // guide
            ])) {
                for (let element of document.querySelectorAll(selector))
                    element.style.display = "none";
            }
            
            injectStyle("page.css"); // src/page/page.css
            injectCode("page.js"); //src/page folder will be compiled into one script called page.js
        }
    });
});

//Handle requests from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
        case "get_status":
            return getStatus(sendResponse);
        case "reload_window":
            return reloadWindow(sendResponse);
        case "export_mapdata":
            return exportMapData(sendResponse);
        case "import_mapdata":
            return importMapData(sendResponse);
        case "clear_mapdata":
            return clearMapData(sendResponse);
        default:
            console.warn("Extension can't handle request ", request);
            return false;
    }
});