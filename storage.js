const storage = new function() {
    this._storage = {};

    this.get = function (key, defaultValue) {
        let data = this._storage[key];
        if (!data) {
            data = localStorage.getItem(key);
            return (this._storage[key] = data && JSON.parse(data)) || defaultValue;
        }
        return data;
    }

    this.load = function (key, defaultValue) {
        delete this._storage[key];
        return this.get(key, defaultValue);
    }

    this.set = function (key, value) {
        this._storage[key] = value;
    }

    this.delete = function(key) {
        localStorage.removeItem(key);
    }

    this.save = function(key) {
        let data = Object.assign({}, this._storage[key] || {});
        
        for (let [k, v] of Object.entries(data)) {
            if (
                v === undefined
                || (typeof (v) === "object" && Object.keys(v).length === 0)
                || (typeof (v) === "string" && v.length === 0))
            {
                delete data[k];
            }
        }

        if (Object.keys(data).length > 0) {
            localStorage.setItem(key, JSON.stringify(data));
        } else {
            localStorage.removeItem(key);
        }
    }
}


class StorageValue {
    constructor(type, key, defaultValueCreator, autosave=true) {
        this.key = key;
        this.type = type;
        this.autosave = autosave;
        this._defaultValueCreator = defaultValueCreator;
        this._value;
    }

    set(value) {
        let data = storage.get(this.key, {});
        data[this.type] = value;
        storage.set(this.key, data);

        if (this.autosave)
            storage.save(this.key);
        
        if (this.constructor === StorageValue)
            this.onset(value);
        return value;
    }

    get() {
        return this._value || (this._value = (storage.get(this.key, {})[this.type] || this._defaultValueCreator()));
    }

    delete() {
        let data = storage.get(this.key, {});
        delete data[this.type];
        delete this._value;
        storage.set(this.key, data);

        if (this.autosave)
            storage.save(this.key);
    }

    onset() {};
}


class SubStorage extends StorageValue {
    constructor(type, key, defaultValueCreator, autosave=true) {
        super(type, key, defaultValueCreator, autosave);
    }

    get(key) {
        if (!key) return super.get({});
        return super.get({})[key] || this.set(key, this._defaultValueCreator());
    }

    set(key, value) {
        let data = super.get({});
        data[key] = value;
        super.set(data);
        this.onset(key, value);
        return value;
    }

    remove(key) {
        let data = super.get({});
        delete data[key];
        this.onset(key, undefined);
        super.set(data);
    }

    onset() {};
}


class Storage {
    constructor(key) {
        Object.defineProperty(this, "key", {
            value: key,
            writable: false
        });
    }

    set autosave(enabled) {
        for (let storageValue of this.values) {
            storageValue.autosave = enabled;
        }
    }

    get values() {
        return Object.values(this);
    }

    save() {
        storage.save(this.key);
    }

    load() {
        let data = storage.load(this.key, {});
        for (let [k, v] of Object.entries(this))
            data[k] = data[k] || v._defaultValueCreator();
        return data;
    }
}


class MapStorage extends Storage {
    constructor(game, autosave = true) {
        super(`mg:data:game_${game}`);

        this.locations  = new SubStorage("locations",   this.key, () => new Object(), autosave);
        this.categories = new SubStorage("categories",  this.key, () => new Object(), autosave);
        this.presets    = new SubStorage("presets",     this.key, () => new Object(), autosave);
    }
}


class Settings extends Storage {
    constructor(game, autosave=true) {
        super(`mg:settings:game_${game}`);

        this.remember_visible_categories = new StorageValue("remember_categories",  this.key, () => new Object(), autosave);
        this.visible_categories = new SubStorage("visible_categories",              this.key, () => new Object(), autosave);

        this.remember_visible_categories.onset = function(value) {
            if (!value) this.visible_categories.delete();
        }
    }
}