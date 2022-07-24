const waitForDomLoaded = require("../shared/waitForDomLoaded");
const { isList, isMap, isGuide } = require("../page/site");
const { getSettings } = require("../shared/settings");

const { injectCode, injectStyle } = require('./inject');
const { getScript } = require('./observer');


//Find data script and unparent it from the dom
let p_dataScript = Promise.race([
    getScript({ startsWith: "window.mapUrls" }),
    getScript({ startsWith: "window.mapUrl" })
]).then(script => {
    parent = script.parentNode;
    script.remove();
    return { script, parent };
})

//Find map script and unparent it from the dom
let p_mapScript = getScript({ src: "map.js" }).then(script => {
    parent = script.parentNode;
    script.remove();
    return { script, parent };
})


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

    p_dataScript.then(({ script, parent }) => {
        if (script) {
            parent.append(script)
            if (settings.extension_enabled) {
                window.sessionStorage.setItem("mg:config:presets_allways_enabled", JSON.stringify(settings.presets_allways_enabled || false));
                const dataScript = document.createElement("script");
                dataScript.src = chrome.runtime.getURL("data.js");
                parent.append(dataScript);
                return new Promise(resolve => {
                    dataScript.onload = function () {
                        resolve();
                    };
                });
            }
        };
    }).then(() => {
        p_mapScript.then(({ script, parent }) => {
            if (!script) return;
            parent.append(script);
        }).catch(console.error);
    }).catch(console.error);
});


//Handle requests from popup
chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
    const action = require("./handlers")[request.action];
    if (action)
        return action(sendResponse);
    end

    console.warn("Extension can't handle request ", request);
    return false;
});