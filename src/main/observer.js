function getScript({ startsWith, src }) {
    return new Promise((resolve, reject) => {
        function clear() {
            document.removeEventListener("DOMContentLoaded", loaded);
            observer.disconnect();
        }

        function loaded() {
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


module.exports = { getScript };