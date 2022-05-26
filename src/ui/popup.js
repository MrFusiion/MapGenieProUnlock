function send(action, data, options={ all: false }) {
    let queryOptions = options.all && {} || { active: true, currentWindow: true };
    return new Promise((resolve, reject) => {
        chrome.tabs.query(queryOptions, tabs => {
            Promise.all(tabs.map(tab => {
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
                if (queryOptions.active && queryOptions.currentWindow) {
                    resolve(results[0]);
                }
                resolve(results);
            })
        });
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
    $
    $importBtn.prop("disabled", activeCount < 1);
    $exportBtn.prop("disabled", activeCount < 1);
    $clearBtn.prop("disabled", activeCount < 1);
}


function handleOption(option, value) {
    MG_CONFIG[option] = value;
    chrome.storage.sync.set({ config: MG_CONFIG });
}


let $exportBtn = $("button#export");
$exportBtn.click(() => {
    send("export_mapdata");
});

let $importBtn = $("button#import");
$importBtn.click(() => {
    send("import_mapdata");
});

let $clearBtn = $("button#clear");
$clearBtn.click(() => {
    send("clear_mapdata");
});


const IS_CHROME_EXTENSION = typeof chrome !== "undefined";
const MG_CONFIG = {};
const DEV_BUILD = false;
const { MANIFEST, OPTIONS_URL } = (function() {
    if (IS_CHROME_EXTENSION && chrome.runtime && chrome.runtime.getManifest) {
        return {
            MANIFEST    : chrome.runtime.getManifest(),
            OPTIONS_URL : chrome.runtime.getURL("ui/options.json"),
        };
    }
    return { MANIFEST: { version: "0.0.0", author: "me" }, OPTIONS_URL: "options.json" };
})();


$("#version").text(`v${MANIFEST.version}`);
$("#author").text(`by ${MANIFEST.author}`);


let $reloadButton = $(".reload-button");
let $mapgenieButton = $(".mapgenie-button");
if (DEV_BUILD) {
    $reloadButton.click(() => {
        send("reload_window").then(() => {
            chrome.runtime.reload();
        });
    });
    $mapgenieButton.hide();
} else {
    $mapgenieButton.click(() => {
        chrome.tabs.create({ url: "https://mapgenie.io" });
    });
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
                $optionElement.find(".info").on("mouseover", function() {
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

console.log("Hello World");