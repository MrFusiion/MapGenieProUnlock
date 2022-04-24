function deepCopy(obj) {
    if (typeof obj === "object") {
        let newObj = obj instanceof Array ? [] : {};
        for (let key in obj) {
            if (typeof obj[key] === "object") {
                newObj[key] = deepCopy(obj[key]);
            } else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }
    return obj;
}


function objectSet(obj, newObj) {
    for (let key in obj) {
        if (!newObj.hasOwnProperty(key)) {
            delete obj[key];
        }
    }
    for (let key in newObj) {
        obj[key] = deepCopy(newObj[key]);
    }
    return obj;
}


function deepAsign(value, newValue) {
    if (typeof value === "object" && typeof newValue === "object") {
        let o = newValue instanceof Array ? [] : {};
        for (let key in value) {
            o[key] = value[key];
        }
        for (let key in newValue) {
            o[key] = deepAsign(value && value[key], newValue && newValue[key]);
        }
        return o;
    }
    return deepCopy(typeof newValue === "undefined" ? value : newValue);
}


function objMinimize(data, defaultData) {
    if (typeof data === "object") {
        let o = data instanceof Array ? [] : {}, c = 0;
        for (let key in data) {
            let val = objMinimize(data && data[key], defaultData && defaultData[key]);
            if (val !== undefined) {
                o[key] = val;
                c++;
            }
        }
        return c > 0 > 0 ? o : undefined;
    }
    if (typeof data !== "undefined" && data !== defaultData) {
        return data;
    }
}


function objDiff(obj1, obj2) {
    if (typeof obj1 === "object" && typeof obj2 === "object"
        && (obj1 instanceof Array == obj2 instanceof Array))
    {
        let o = obj1 instanceof Array ? [] : {};
        let len1 = Object.keys(obj1).length;
        let len2 = Object.keys(obj2).length;
        for (var i = 0; i < Math.min(len1, len2); i++) {
            
        }
    } else if (obj1 !== obj2) {
        return { 1: obj1, 2: obj2 };
    }
}


class MGApiFilter {
    static #matches = new Set(["locations", "categories", "presets/reorder", "presets"].map((key) => {
        return `/api/v1/user/${key}`;
    }));
    static Filtered = Symbol("filtered");

    constructor(axios) {
        if (axios[MGApiFilter.Filtered]) throw new Error("MGApiFilter already filtered this object!", axios);
        axios[MGApiFilter.Filterered] = true;
        axios.post      = this._filter(axios.post,      "set");
        axios.put       = this._filter(axios.put,       "set");
        axios.delete    = this._filter(axios.delete,    "remove");
    }

    _filter(f, handlerName) {
        return (str, data) => {
            if (this.hasOwnProperty(handlerName)) {
                for (let apiurl of MGApiFilter.#matches) {
                    if (str.match(apiurl)) {
                        let id = parseInt((str.match(/(\d+)$/)||{1: -1})[1]);
                        let key = str.match(/\/api\/v1\/user\/([A-Za-z_]+(\/[A-Za-z_]+)*)/)[1];
                        return Promise.resolve(this[handlerName](key, id, data, str));
                    }
                }
            } else {
                console.warn(`MGApiFilter: No handler for ${handlerName} on`, this);
            }
            return f(...arguments);
        }
    }
}


class MGStorageFilter {
    static #matches = new Set(["visible_categories", "remember_categories"]);

    constructor(window) {
        let _localStorage = window.localStorage;

        let setItem = _localStorage.setItem.bind(_localStorage);
        _localStorage.setItem = this._filter(setItem, "set");

        let removeItem = _localStorage.removeItem.bind(_localStorage);
        _localStorage.removeItem = this._filter(removeItem, "remove");
    }

    _filter(f, handle) {
        return (key, value) => {
            for (let match of MGStorageFilter.#matches) {
                if (key.match(match)) {
                    if (this[handle](match, key, value)) {
                        return f(key, value);
                    }
                    return value;
                }
            }
            return f(key, value);
        }
    }

    set() { return true; }
    remove() { return true; }
}