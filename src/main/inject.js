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


module.exports = { injectCode, injectStyle };