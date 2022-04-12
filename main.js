const DEBUG = false;
let maps;


function getDataKey(game) {
    //let title = game && game.slug || "unknown";
    let id = game && game.id || -1
    return `mg:data:game_${id}`;
}

function getSettingsKey(game) {
    let id = game && game.id || -1
    return `mg:settings:${id}`;
}

function getIdFromApiCall(s) {
    return parseInt(s.match("/\\d+")[0].match("\\d+")[0], 10);
}


// Saving and Removing functions
let storage = {
    TYPES: {
        LOCATIONS: "locations",
        CATEGORIES: "categories",
        PRESETS: "presets"
    },

    save(type, val, game) {
        let data = this.load(null, game);
        data[type] = data[type] || {};
        data[type][val] = true;

        window.localStorage.setItem(getDataKey(game), JSON.stringify(data));
    },

    load: function(type, game) {
        let data = JSON.parse(window.localStorage.getItem(getDataKey(game)) || "{}");
        data.locations = data.locations || {};
        data.categories = data.categories || {};

    if (type) {
        return data[type];
    }
    return data 
    },

    remove(type, val, game) {
        let data = this.load(null, game);
        data[type] = data[type] || {};
        delete data[type][val];
        
        let empty = true;
        for (let type of Object.values(storage.TYPES)) {
            if (Object.keys(data[type] || {}).length > 0) {
                empty = false;
                break;
            } else {
                delete data[type];
            }
        }
        
        if (!empty) {
            window.localStorage.setItem(getDataKey(game), JSON.stringify(data));
        } else {
            window.localStorage.removeItem(getDataKey(game));
        }
    },

    export(dest) {
        
    },

    import(path) {

    }
}


// Creates wrapper function that filters specific string out
function newFilter(filter, f) {
    let _f = f;
    return function (s) {
        for (let [str, cb] of Object.entries(filter)) {
            if (s.match(str)) {
                cb(...arguments);
                if (DEBUG) { console.log("blocked", s) };
                return new Promise((r) => { r(); });
            }
        }
        return _f(...arguments);
    }
}


// Returns True if the given object is an array or else False
function isArray(object) {
    return typeof object === "object" && object.constructor == Array;
}


// Waits for a secific value
async function waitFor(object, select) {
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let c = 0;
    let val;
    while (true) {
        await sleep(100);
        val = select(object);
        if (val !== undefined) {
            break;
        } else if (c > 100) {
            console.warn("waitFor timed out on object", object);
            break;
        }
        c += 1;
    }
    return val;
}

class Template {
    constructor(content, selectors) {
        this.template = document.createElement("template");
        this.template.innerHTML = content;
        document.head.appendChild(this.template);

        this.selectors = selectors;
    }

    clone() {
        let element = this.template.content.cloneNode(true);
        let obj = { element: element };

        for (let [name, selector] of Object.entries(this.selectors)) {
            if (name !== "element") {
                obj[name] = element.querySelector(selector);
            }
        }

        return obj;
    }
}