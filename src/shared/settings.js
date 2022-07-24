const options = Object.freeze(require("../options"));

//Gets all options
function getOptions() {
    return options;
}

//Gets stored extension settings
function getSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get(["config"], (result) => {
            let config = Object.assign({}, ...getOptions().map((option) => ({ [option.name]: option.default })), result.config || {});

            //Cleanup faulty keys
            for (let key in config) {
                if (key.match(/^\d+$/)) {
                    delete config[key];
                }
            }

            setSettings(config);
            resolve(config);
        });
    });
}

//Sets stored extension settings
function setSettings(settings) {
    chrome.storage.sync.set({ config: settings });
}


module.exports = { getOptions, getSettings, setSettings };