function send(action, data, options={ all: false }) {
    let queryOptions = options.all && {} || { active: true, currentWindow: true };
    return chrome.tabs.query(queryOptions).then(tabs => {
        return Promise.all(tabs.map(tab => {
            return new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action, data }, (res) => {
                    var lastError = chrome.runtime.lastError;
                    if (lastError) {
                        reject(lastError);
                    } else {
                        resolve(res);
                    }
                });
            }).catch((err) => {
                return new Error(err);
            });
        })).then((results) => {
            console.log(results);
            if (queryOptions.active && queryOptions.currentWindow) {
                return results[0];
            }
            return results;
        }).catch(console.log);
    });
}


function setStatus(status) {
    status = status || {};
    let activeCount = 0;
    for (let $statusElement of $statusElements) {
        if (status[`is_${$statusElement.attr("id")}`]) {
            activeCount++; 
            $statusElement.addClass("active");
        } else {
            $statusElement.removeClass("active");
        }
    }
    $importBtn.prop("disabled", activeCount < 1);
    $exportBtn.prop("disabled", activeCount < 1);
}


function handleOption(option, value) {
    MG_CONFIG[option] = value;
    chrome.storage.sync.set({ config: MG_CONFIG });
}


let $exportBtn = $("button#export");
$exportBtn.click(() => {
    send("export_mapdata").then(function (name, data) {
        let blob = new Blob([data], { type: "text/plain;charset=utf-8" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = `${name}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    });
});

let $importBtn = $("button#import");
$importBtn.click(() => {
    var filebrowser = $(`<input type="file">`).get(0);
    filebrowser.click();
    filebrowser.onchange = () => {
        let file = filebrowser.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                console.log(e.target.result);
            }
            reader.readAsText(file);
        }
    };
});



const MG_CONFIG = {};
const { MANIFEST, OPTIONS_URL, DEV_BUILD, IS_CHROME_EXTENSION } = (function() {
    if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        return {
            MANIFEST    : chrome.runtime.getManifest(),
            OPTIONS_URL : chrome.runtime.getURL("ui/options.json"),
            DEV_BUILD   : !!chrome.runtime.getManifest().version_name.match("DEV"),
            IS_CHROME_EXTENSION: true
        };
    }
    return { MANIFEST: { version: "0.0.0", author: "me" }, OPTIONS_URL: "options.json", DEV_BUILD: true, IS_CHROME_EXTENSION: false };
})();


$("#version").text(`v${MANIFEST.version}`);
$("#author").text(`by ${MANIFEST.author}`);


let $reloadButton = $(".reload-button");
if (DEV_BUILD) {
    $reloadButton.click(() => {
        send("reload_window").then(() => {
            chrome.runtime.reload();
        });
    });
} else {
    $reloadButton.hide();
}

let $closeButton = $(".close-button");
$closeButton.click(() => {
    window.close();
});

let $optionElements = [];
let $statusElements = [];
fetch(OPTIONS_URL)
    .then(response => response.json())
    .then(function (options) {
        let $optionsContainer    = $(".options");
        let $statusContainer     = $(".statuses");

        for (let option of options) {
            MG_CONFIG[option.name] = option.default;

            if (option.type === "checkbox") {
                let $optionElement = $(`
                    <div class="option" type="${option.type}">
                        <div class="toggle-button-cover">
                            <div class="button r">
                                <input class="checkbox" type="checkbox" id=${option.name}>
                                <div class="knobs"></div>
                                <div class="layer"></div>
                            </div>
                        </div>
                        <span data-tooltip="${option.tooltip}">${option.label}</span>
                        <i class="info fa fa-question-circle"></i>
                    </div>`);

                $optionElement.find(".checkbox").prop("checked", option.default).click(function() {
                    handleOption(option.name, this.checked);
                });

                let $label = $optionElement.find("span[data-tooltip]");
                $optionElement.on("mouseover", function() {
                    $label.addClass("hover");
                }).on("mouseout", function() {
                    $label.removeClass("hover");
                });

                $optionElements.push($optionElement);
                $optionsContainer.append($optionElement);
            }
        }

        for (let status of ["map", "guide"]) {
            let $statusElement = $(`
                <div class="status" id="${status}">
                    <div class="status-dot"></div>
                    <span>${status}</span>
                </div>
            `)
                
            $statusElements.push($statusElement);
            $statusContainer.append($statusElement);
        }

        send("get_status").then(setStatus);

        if (IS_CHROME_EXTENSION && chrome.storage) {
            chrome.storage.sync.get(["config"], function (result) {
                let config = result.config || {};
                if (Object.keys(config).length == 0) {
                    chrome.storage.sync.set({ config: MG_CONFIG });
                } else {
                    Object.assign(MG_CONFIG, config);
                }

                for (let $optionElement of $optionElements) {
                    let type = $optionElement.attr("type");
                    if (type === "checkbox") {
                        let $input = $optionElement.find("input");
                        $input.prop("checked", MG_CONFIG[$input.attr("id")]);
                    }
                }
            });
        }
    })
    .catch(function (error) {
        console.error(error);
    });