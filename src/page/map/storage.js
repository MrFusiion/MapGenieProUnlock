const { deepCopy, deepAsign, objectSet, objMinimize } = require("../common");

function findOldMapData(gameid) {
    let key = `mg:data:game_${gameid}`;
    let data = window.localStorage.getItem(key);
    if (data) {
        window.localStorage.removeItem(key);
        return JSON.parse(data);
    }
    return null;
}

class MGMapStorage {
    #key; #eventTarget;

    static default = {
        data: {
            locations: {},
            categories: {},
            presets: {},
            presets_order: [],
            visible_categories: {},
        },

        settings: {
            remember_categories: false,
        }
    }

    constructor(window, autosave = true) {
        let gameid = window.game.id;
        let userid = window.user.id;
        this.#key = `mg:game_${gameid}:user_${userid}`;
        this.#eventTarget = new EventTarget();
        this.localStorage = window.localStorage;
        this.autosave = autosave;
        this.mapData = {
            map_id: window.mapData.map.id,
            locationsById: window.store.getState().map.locationsById
        }
    }

    get key() {
        return this.#key;
    }

    updateData(f) {
        let newData = f(deepCopy(this.data));
        if (typeof newData === "undefined") throw new Error("updateData: update function did not return a value!");
        objectSet(this.data, newData);
        this.saveCheck();
        return this;
    }

    updateSettings(f) {
        let newSettings = f(deepCopy(this.settings));
        if (typeof newSettings === "undefined") throw new Error("updateSettings: update function did not return a value!");
        objectSet(this.settings, newSettings);
        this.saveCheck();
        return this;
    }

    update(f) {
        let newData = f(deepCopy({ data: this.data, settings: this.settings }));
        if (typeof newData === "undefined") throw new Error("update: update function did not return a value!");
        objectSet(this.data, newData.data || {});
        objectSet(this.settings, newData.settings || {});
        this.saveCheck();
        return this;
    }

    load() {
        let storage = JSON.parse(this.localStorage.getItem(this.#key) || null) || {};
        
        // find old map data from previous version v3.0.0
        let oldData = findOldMapData(this.mapData.map_id);
        let data = deepAsign(MGMapStorage.default.data, Object.assign({}, oldData || {}, storage.data || {}));
        let settings = deepAsign(MGMapStorage.default.settings, storage.settings || {});

        this.data = objectSet(this.data || {}, data);
        this.settings = objectSet(this.settings || {}, settings)

        if (oldData) {
            this.save();
        }

        let c = 0;
        let mapId = this.mapData.map_id;
        let locationsById = this.mapData.locationsById;
        for (let locId in this.data.locations) {
            let loc = locationsById[locId];
            if (loc && loc.map_id == mapId) {
                c++;
            }
        }

        this.local = {
            foundLocationsCount: c,
        }
    }

    save() {
        let data = objMinimize(this.data, MGMapStorage.default.data);
        let settings = objMinimize(this.settings, MGMapStorage.default.settings);
        if (data || settings) {
            this.localStorage.setItem(this.#key, JSON.stringify({ data, settings }));
        } else {
            this.localStorage.removeItem(this.#key);
        }
    }

    saveCheck() {
        if (this.autosave) this.save();
    }

    on(type, f) {
        this.#eventTarget.addEventListener(type, f);
    }

    off(type, f) {
        this.#eventTarget.removeEventListener(type, f);
    }
}

module.exports = MGMapStorage;