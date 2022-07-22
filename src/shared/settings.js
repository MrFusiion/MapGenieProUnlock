let _defaultSettings, _options;

//Gets all options
function getOptions() {
    if (_options) {
        return Promise.resolve(_options);
    }
    return fetch(chrome.runtime.getURL("options.json")).then(res => res.json()).then(options => {
        // console.log(options);
        _options = options;
        return options;
    });
}

//Gets the default extension settings
function getDefaultSettings() {
    if (_defaultSettings) {
        return Promise.resolve(_defaultSettings);
    }
    return getOptions().then(options => {
        const dfltSettings = {};
        for (let option of options) {
            // console.log(option);
            dfltSettings[option.name] = option.default;
        }
        _defaultSettings = dfltSettings;
        return dfltSettings;
    });
}

//Gets stored extension settings
function getSettings() {
    return new Promise((res, rej) => {
        chrome.storage.sync.get(["config"], (result) => {
            let config = result.config || {};
            getDefaultSettings().then(settings => {
                config = Object.assign({}, settings, config);
                // console.log(config, settings);
                chrome.storage.sync.set({ config });
                res(config);
            }).catch(rej);
        });
    });
}

function setSettings(settings) {
    // console.log("Set settings: ", settings);
    chrome.storage.sync.set({ config: settings });
}


module.exports = { getDefaultSettings, getOptions, getSettings, setSettings };