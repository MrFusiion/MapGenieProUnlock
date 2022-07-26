const { getOptions, getSettings, setSettings } = require("../shared/settings");

let Settings;
let $buttons = [];
let $optionElements = [];
let $statusElements = [];

function send(action, data, options = { all: false }) {
    let queryOptions = options.all && {} || { active: true, currentWindow: true };
    return new Promise((resolve) => {
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
    let activeCount = 0;
    for (let $statusElement of $statusElements) {
        if (status?.[`is_${$statusElement.attr("id")}`]) {
            activeCount++; 
            $statusElement.addClass("active");
        } else {
            $statusElement.removeClass("active");
        }
    }
    for (let $btn of $buttons) {
        $btn.prop("disabled", activeCount < 1);
    }
}

function assignButton(selector, action) {
    $buttons.push($(selector).click(() => {
        send(action);
        window.close();
    }));
}

function addCheckboxOption(name, label, checked, tooltip="") {
    const $optionElement = $(`<div class="option" type="checkbox">
        <div class="toggle-button-cover">
            <div class="button r">
                <input class="checkbox" type="checkbox" id=${name}>
                <div class="knobs"></div>
                <div class="layer"></div>
            </div>
        </div>
        <span data-tooltip="${tooltip}">${label}</span>
        <i class="info fa fa-question-circle"></i>
    </div>`);

    $optionElement.find(".checkbox").prop("checked", checked).click(function () {
        Settings[name] = this.checked;
        setSettings(Settings);
        chrome.storage.sync.set({ config: Settings });
    });

    const $label = $optionElement.find("span[data-tooltip]");
    $optionElement.find(".info").on("mouseover", function () {
        $label.addClass("hover");
    }).on("mouseout", function () {
        $label.removeClass("hover");
    });

    $(".options").append($optionElement);

    $optionElements.push($optionElement);
}

function addStatus(name) {
    const $statusElement = $(`<div class="status" id="${name}">
        <div class="status-dot"></div>
        <span>${name}</span>
    </div>`);

    $(".statuses").append($statusElement);

    $statusElements.push($statusElement);
}


//Reload button to reload extension when enabled in html
$(".reload-button").click(() => {
    send("reload_window").then(() => {
        chrome.runtime.reload();
    });
});

//Shortcut to mapgenie homepage
$(".mapgenie-button").click(() => {
    chrome.tabs.create({ url: "https://mapgenie.io" });
});

//Closes the extension
$(".close-button").click(window.close.bind(window));

//Add options
for (let option of getOptions()) {
    addCheckboxOption(option.name, option.label, option.default, option.tooltip);
}

//Add status elements
addStatus("map");
addStatus("guide");
send("get_status").then(setStatus);

//Map data buttons to extract, import or clear data;
assignButton("button#export", "export_mapdata");
assignButton("button#import", "import_mapdata");
assignButton("button#clear", "clear_mapdata");

//Set extension info at the footer
$("#version").text(`v${chrome.runtime.getManifest().version_name}`);
$("#author").text(`by ${chrome.runtime.getManifest().author || "me"}`);
$("#author").click(() => {
    chrome.tabs.create({ url: "https://github.com/MrFusiion/MapGenieProUnlock" });
});

getSettings().then(settings => {
    Settings = settings;
    for (let $optionElement of $optionElements) {
        let type = $optionElement.attr("type");
        if (type === "checkbox") {
            let $input = $optionElement.find("input");
            $input.prop("checked", settings[$input.attr("id")]);
        }
    }
});