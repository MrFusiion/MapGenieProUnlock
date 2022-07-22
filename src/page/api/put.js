class ApiPutHandler {
    constructor(_, storage) {
        this.storage = storage;
        this.et = new EventTarget();
    }

    locations(_, id) {
        this.storage.updateData(data => {
            if (!data.locations[id]) {
                data.locations[id] = true;
                this.storage.local.foundLocationsCount += 1;
            }
            return data;
        });
        this._dispatch("locations", { id });
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

module.exports = ApiPutHandler;