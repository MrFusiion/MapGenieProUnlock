class ApiDeleteHandler {
    constructor(store, storage) {
        this.hasDfltPreset = store.state.user.presets.length > 0;
        this.storage = storage;
        this.et = new EventTarget();
    }

    presets(_, id) {
        this.storage.updateData(data => {
            let index = data.presets_order.indexOf(id);
            if (index !== -1) data.presets_order.splice(index, 1);

            if (this.hasDfltPreset && data.presets_order.length == 1) data.presets_order = [];
            delete data.presets[id];
            return data;
        });
    }

    locations(_, id) {
        this.storage.updateData(data => {
            if (data.locations[id]) {
                delete data.locations[id];
                this.storage.local.foundLocationsCount -= 1;
            }
            return data;
        });
        this._dispatch("locations", { id });
    }

    categories(_, id) {
        this.storage.updateData(data => {
            delete data.categories[id];
            return data;
        });
        this._dispatch("categories", { id });
    }

    _dispatch(name, data) {
        this.et.dispatchEvent(Object.assign(new Event(name), data));
    }

    on(name, f) {
        this.et.addEventListener(name, f)
    }

    off(name, f) {
        this.et.removeEventListener(name, f);
    }
}

module.exports = ApiDeleteHandler;