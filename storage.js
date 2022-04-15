class LocalStorage {
    static _storage = {};
    static _filters = {};

    static get = function (key, defaultValue) {
        let data = this._storage[key];
        if (data === undefined) {
            data = localStorage.getItem(key);
            return (this._storage[key] = data && JSON.parse(data) || defaultValue);
        }
        return data;
    }

    static load(key, defaultValue) {
        delete this._storage[key];
        return this.get(key, defaultValue);
    }

    static set(key, value) {
        this._storage[key] = value;
    }

    static delete(key) {
        localStorage.removeItem(key);
    }

    static save(key) {
        let data = this._storage[key];
        
        if (
            data === undefined
            || (typeof (data) === "object" && Object.keys(data).length === 0)
            || (typeof (data) === "string" && data.length === 0)
        )
            localStorage.removeItem(key);
        else
            localStorage.setItem(key, JSON.stringify(data));
    }

    static addFilter(key, match, filter) {
        let f = function () { return filter(...arguments); };
        f.match = match;
        LocalStorage._filters[key] = f;
    }

    static removeFilter(key) {
        LocalStorage._filters[key];
    }
}


{
    let _setItem = localStorage.setItem.bind(localStorage);
    let _removeItem = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = function (key, data) {
        if (!data) return _removeItem(key);
        for (let filter of Object.values(LocalStorage._filters)) {
            if (key.match(filter.match)) {
                if (filter("set", key))
                    _setItem(key, data);
                return;
            }
        }
        _setItem(key, data);
    }

    localStorage.removeItem = function (key) {
        for (let filter of Object.values(LocalStorage._filters)) {
            if (key.match(filter.match)) {
                if (filter("remove", key))
                    _removeItem(key);
                return;
            }
        }
        _removeItem(key);
    }
}


class StorageValue {
    constructor(key, autosave=true) {
        this.key = key;
        this.autosave = autosave;
        this._value;
    }

    set(value) {
        this._value = value;
        LocalStorage.set(this.key, value);

        if (this.autosave) {
            LocalStorage.save(this.key);
        }
        
        if (this.constructor === StorageValue)
            this.onset(value);
        return value;
    }

    get(defaultValue) {
        return this._value || (this._value = LocalStorage.get(this.key, defaultValue));
    }

    delete() {
        delete this._value;
        LocalStorage.set(this.key, undefined);

        if (this.autosave)
            LocalStorage.delete(this.key);
    }

    load() {
        delete this._value;
        return this.get();
    }

    save() {
        LocalStorage.save(this.key);
    }

    onset() {};
}


class SubStorage extends StorageValue {
    constructor(key, autosave=true) {
        super(key, autosave);
        this._count = 0;
    }

    get(key) {
        if (!this._value) {
            super.get({});
            this._count = Object.keys(this._value).length;
        }
        if (!key) return this._value;
        return this._value[key];
    }

    set(key, value) {
        let data = super.get({});
        if (data[key] === undefined && value !== undefined)
            this._count++;
        
        data[key] = value;
        super.set(data);

        this.onset(key, value);
        return value;
    }

    remove(key) {
        let data = this.get();
        if (data[key] !== undefined)
            this._count--;  
    
        delete data[key];
        super.set(data);

        this.onset(key);
    }

    delete() {
        super.delete();
        this._count = 0;
    }

    get count() {
        return this._count;
    }

    get keys() {
        return Object.keys(this.get());    
    }

    get values() {
        return Object.values(this.get());
    }

    onset() {};
}


class ListStorage extends StorageValue {
    constructor(key, autosave = true) {
        super(key, autosave);
        this._count = 0;
    }

    get(index) {
        if (!this._value) {
            super.get([]);
            this._count = Object.keys(this._value).length;
        }
        if (!index) return this._value;
        return this._value[index];
    }

    set(index, value) {
        let list = this.get();
        if (list[index] === undefined)
            this._count++;

        list[index] = value;
        super.set(list);

        this.onset(index, value);
    }

    push(value) {
        let list = this.get();
        list.push(value);
        super.set(list);
        this.onpush(value);
        this._count++;
    }

    pop() {
        let list = this.get();
        let value = list.pop();
        super.set(list);
        this._count--;
        this.onpop(value)
        return value;
    }

    remove(index) {
        let list = this.get();
        if (list[index] !== undefined)
            this._count--;

        delete list[index];
        super.set(list);
        
        this.onset(index);
    }

    delete() {
        super.delete();
        this._count = 0;
    }

    get count() {
        return this._count;
    }

    onpush()    { };
    onpop()     { };
}


class StorageType {
    set autosave(enabled) {
        for (let storageValue of Object.values(this)) {
            storageValue.autosave = enabled;
        }
    }

    save() {
        for (let [k, v] of Object.entries(this))
            v.save();
    }

    load() {
        let data = {}
        for (let [k, v] of Object.entries(this))
            data[k] = v.load();
        return data;
    }
}


class MapStorage extends StorageType {
    constructor(game, autosave = true) {
        super();
        
        let key = `mg:data:game_${game}`
        this.locations          = new SubStorage    (`${key}:locations`,        autosave);
        this.categories         = new SubStorage    (`${key}:categories`,       autosave);
        this.presets            = new SubStorage    (`${key}:presets`,          autosave);
        this.presets_ordering   = new StorageValue  (`${key}:presets_ordering`, autosave);
    }
}


class MapSettingsStorage extends StorageType {
    constructor(game, autosave = true) {
        super();

        let key = `mg:settings:game_${game}`
        this.remember_categories            = LocalStorage.get(`${key}:remember_categories`, false);
        this.visible_categories             = new SubStorage(`${key}:visible_categories`, autosave);

        LocalStorage.addFilter("visible_categories", /mg:settings:game_\d+:visible_categories:id_\d+/g, (action, key) => {
            let id = key.match(/\d+/g)[1];
            switch (action) {
                case "set":
                    this.visible_categories.set(id, true);
                    break;
                case "remove":
                    this.visible_categories.remove(id);
                    break;
            }
        });

        LocalStorage.addFilter("remember_categories", /mg:settings:game_\d+:remember_categories/g, (action) => {
            switch (action) {
                case "set":
                    this.remember_categories = true;
                    break;
                case "remove":
                    this.remember_categories = false;
                    this.visible_categories.delete();
                    break;
            }
            return true;
        });
    }
}