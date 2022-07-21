const { getSettings } = require("../shared/settings");

// class ScriptNotFoundError extends Error { constructor(script) { super(`Script ${JSON.stringify(script)} was not found when observing document`) } };

function getScript({ startsWith, src }) {
    return new Promise((resolve, reject) => {
        function clear() {
            document.removeEventListener("DOMContentLoaded", loaded);
            observer.disconnect();
        }

        function loaded() {
            // reject(new ScriptNotFoundError({ startsWith, src }));
            clear();
        }

        const observer = new MutationObserver(function (mutations_list) {
            mutations_list.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (added_node) {
                    if (added_node.nodeName === "SCRIPT") {
                        if (startsWith && added_node.innerText.startsWith(startsWith)) {
                            resolve(added_node);
                            clear();
                        } else if (src && added_node.src.match(src)) {
                            resolve(added_node);
                            clear();
                        }
                    }
                });
            });
        });
        document.addEventListener("DOMContentLoaded", loaded);

        observer.observe(document, { childList: true, subtree: true });
    });
}


let p_dataScript = Promise.race([
    getScript({ startsWith: "window.mapUrls" }),
    getScript({ startsWith: "window.mapUrl" })
]).then(script => {
    parent = script.parentNode;
    script.remove();
    return { script, parent };
})


let p_mapScript = getScript({ src: "map.js" }).then(script => {
    // console.log("map.js found");
    parent = script.parentNode;
    script.remove();
    return { script, parent };
})

getSettings().then(settings => {
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