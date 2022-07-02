class MGApiFilter {
    static #matches = new Set(["locations", "categories", "presets/reorder", "presets"].map((key) => {
        return `/api/v1/user/${key}`;
    }));
    static Filtered = Symbol("filtered");

    constructor(axios) {
        if (axios[MGApiFilter.Filtered]) throw new Error("MGApiFilter already filtered this object!", axios);
        axios[MGApiFilter.Filterered] = true;
        axios.post = this._filter(axios.post, "set");
        axios.put = this._filter(axios.put, "set");
        axios.delete = this._filter(axios.delete, "remove");
    }

    _filter(f, handlerName) {
        return (...args) => {
            const [str, data] = args;
            if (this.hasOwnProperty(handlerName)) {
                for (let apiurl of MGApiFilter.#matches) {
                    if (str.match(apiurl)) {
                        let id = parseInt((str.match(/(\d+)$/) || { 1: -1 })[1]);
                        let key = str.match(/\/api\/v1\/user\/([A-Za-z_]+(\/[A-Za-z_]+)*)/)[1];
                        return Promise.resolve(this[handlerName](key, id, data, str));
                    }
                }
            } else {
                console.warn(`MGApiFilter: No handler for ${handlerName} on`, this);
            }
            return f(...args);
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


module.exports = {
    MGApiFilter,
    MGStorageFilter
}