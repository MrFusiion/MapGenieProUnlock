const DEBUG = false;



function getKey() {
    let map = window.mapData.map;
    let title = map && map.title.toLowerCase() || "unknown";
    let id = map && map.id || -1
    return `mg_data_${title}_${id}`;
}


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

    remove(type, val) {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");
        data[type] = data[type] || {};
        delete data[type][val];
        
        let empty = true;
        for (let type of Object.values(storage.TYPES)) {
            if (Object.keys(data[type] || {}).length > 0) {
                empty = false;
                break;
            }
        }
        
        if (!empty) {
            window.localStorage.setItem(getKey(), JSON.stringify(data));
        } else {
            window.localStorage.removeItem(getKey());
        }
    }
}


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


function isArray(object) {
    return typeof object === "object" && object.constructor == Array;
}