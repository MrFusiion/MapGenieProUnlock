class SetHandler {
    constructor(storage) {
        this.storage = storage;
    }

    visible_categories(key) {
        let id = key.match(/(\d+)$/)[1];
        this.storage.updateData(data => {
            data.visible_categories[id] = true;
            return data;
        });
        return true;
    }

    remember_categories() {
        this.storage.updateSettings(settings => {
            settings.remember_categories = true;
            return settings;
        });
        return true;
    }
}

class RemoveHandler {
    constructor(storage) {
        this.storage = storage;
    }

    visible_categories(key) {
        let id = key.match(/(\d+)$/)[1];
        this.storage.updateData(data => {
            // console.log(data.visible_categories);
            delete data.visible_categories[id];
            return data;
        });
        return true;
    }

    remember_categories() {
        this.storage.update(({ settings, data }) => {
            // console.log(settings, data);
            settings.remember_categories = false;
            for (let key in data.visible_categories) delete data.visible_categories[key];
            return { settings, data };
        });
        return true;
    }
}

class StorageHandler {
    constructor(storage) {
        this.setItem = new SetHandler(storage);
        this.removeItem = new RemoveHandler(storage);
    }
}

module.exports = StorageHandler;