function getScript({ startsWith, src }) {
    return new Promise((resolve, reject) => {
        function clear() {
            document.removeEventListener("DOMContentLoaded", loaded);
            observer.disconnect();
        }

        function loaded() {
            reject(`Script ${JSON.stringify({ startsWith, src })} was not found when observing document`);
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
}).catch(console.error).then((a) => {
    return a || {};
});


let p_mapScript = getScript({ src: "map.js" }).then(script => {
    parent = script.parentNode;
    script.remove();
    return { script, parent }; 
}).catch(console.error).then((a) => {
    return a || {};
});

chrome.storage.sync.get(["config"], function (data) {
    let config = data.config;

    p_dataScript.then(({ script, parent }) => {
        if (script) {
            if (config.extension_enabled) {
                script.innerText = `
                    ${script.innerText}
                    window.mg_pro_unlocker_loaded = true;
                    window.config = window.config || {};
                    window.config.presetsEnabled = window.config.presetsEnabled || ${config.presets_allways_enabled};`;
            }
            parent.append(script);
        };

        p_mapScript.then(({ script, parent }) => {
            if (!script) return;
            parent.append(script);
        }).catch(console.error);

    }).catch(console.error);
});