const DEBUG = false;



function getKey() {
    let map = window.mapData.map;
    let title = map && map.title.toLowerCase() || "unknown";
    let id = map && map.id || -1
    return `mg_data_${title}_${id}`;
}


// Saving and Removing functions
let storage = {
    TYPES: {
        LOCATIONS: "locations",
        CATEGORIES: "categories"
    },

    save(type, val) {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");
        data[type] = data[type] || {};
        data[type][val] = true;
        window.localStorage.setItem(getKey(), JSON.stringify(data));
    },

    load(type) {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");
        data.locations = data.locations || {};
        data.categories = data.categories || {};

        if (type) {
            return data[type];
        }
        return data 
    },

    remove(type, val) {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");
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
            window.localStorage.setItem(getKey(), JSON.stringify(data));
        } else {
            window.localStorage.removeItem(getKey());
        }
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
    while (true) {
        await sleep(100);
        if (select(object) !== undefined) {
            break;
        } else if (c > 100) {
            break;
        }
        c += 1;
    }
    return select(object);
}