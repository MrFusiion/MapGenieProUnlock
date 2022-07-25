class ApiPostHandler {
    constructor(store, storage) {
        this.hasDfltPreset = store.state.user.presets.length > 0;
        this.storage = storage;
        this.et = new EventTarget();
    }

    presets(_, __, postData) {
        this.storage.updateData(data => {
            postData.id = 0;
            for (let i in data.presets) {
                if (postData.id != i) break;
                postData.id++;
            }

            const preset = Object.assign({}, postData);
            delete preset.ordering;

            data.presets[postData.id] = preset;

            if (data.presets_order.length == 0 && this.hasDfltPreset) data.presets_order.push(-1);
            data.presets_order.push(postData.id);

            return data;
        });
        this._dispatch("presets", { postData });

        return { data: postData };
    }

    presets_reorder(_, __, postData) {
        this.storage.updateData(data => {
            data.presets_order = postData.ordering;
            return data;
        });
        this._dispatch("presets_reorder", { ordering: postData.ordering });
    }

    categories(_, id, postData) {
        id = postData?.category || id;
        this.storage.updateData(data => {
            data.categories[id] = true;
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

module.exports = ApiPostHandler;