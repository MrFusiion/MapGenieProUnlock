class MGMapStore {
    #map; #gameid;

    constructor(window, storage) {
        this.store = window.store;
        this.#map = window.map;
        this.#gameid = window.game.id;

        // create wrapper for getState so we can overide some values
        let getState = window.store.getState;
        window.store.getState = () => {
            let state = getState();
            if (storage.local && storage.data) {
                state.user.foundLocationsCount = storage.local.foundLocationsCount;
                state.user.foundLocations = storage.data.locations;
                state.user.trackedCategories = Object.keys(storage.data.categories).map((key) => parseInt(key));
            }
            return state;
        }
    }

    *locations(categories = undefined) {
        let locations = this.state.map.locations;
        for (let i in locations) {
            let loc = locations[i];
            if (!categories || categories.find(val => val == loc.category_id)) {
                yield loc;
            }
        }
    }

    *categories(locations = undefined, visible = undefined) {
        let categories = this.state.map.categories;
        let wantCategories = locations && new Set(locations.map((loc) => loc.category_id));
        for (let i in categories) {
            let cat = categories[i];
            if (!locations || wantCategories.has(cat.id)) {
                if (visible === undefined || cat.visible == visible) {
                    yield cat;
                }
            }
        }
    }

    get state() {
        return this.store.getState();
    }

    _dispatch(type, meta = {}) {
        this.store.dispatch({ type, meta });
    }

    isMarked(id) {
        return this.state.user.foundLocations[id] ? true : false;
    }

    markLocation(id, found = true) {
        id = parseInt(id);
        this.#map.setFeatureState({ source: "locations-data", id }, { found });
        if (this.#gameid === 80) this.#map.setFeatureState({ source: "circle-locations-data", id }, { found });
    }

    toggleLocation(id) {
        if (this.isMarked(id)) {
            this.markLocation(id, false);
        } else {
            this.markLocation(id, true);
        }
    }

    markLocations(found = true, options = { categories: undefined, locations: undefined }) {
        let { categories, locations } = options;
        for (let loc of this.locations(options.categories)) {
            let correctCategory = !categories || categories.find(val => val == loc.category_id);
            let correctLocation = !locations || locations.find(val => val == loc.id);
            if (correctCategory && correctLocation) {
                this.markLocation(loc.id, found);;
            }
        }
    }

    showSpecificLocations(locations = [], categories = []) {
        console.log(locations.map(id => parseInt(id)), categories.map(id => parseInt(id)));
        this._dispatch("HIVE:MAP:SHOW_SPECIFIC_LOCATIONS", {
            locationIds: locations.map(id => parseInt(id)),
            categoryIds: categories.map(id => parseInt(id))
        })
    }

    setSelectedLocation(locationId) {
        this._dispatch("HIVE:MAP:SET_SELECTED_LOCATION", { locationId });
    }

    trackCategory(id, track = true) {
        let type = track && "HIVE:USER:ADD_TRACKED_CATEGORY" || "HIVE:USER:REMOVE_TRACKED_CATEGORY";
        this._dispatch(type, { categoryId: parseInt(id) });
    }

    trackCategories(track = true, categories) {
        for (let cat in (categories || this.state.categories)) {
            this.trackCategory(cat, track);
        }
    }

    showAllCategories() {
        this._dispatch("HIVE:MAP:SHOW_ALL_CATEGORIES");
    }

    hideAllCategories() {
        this._dispatch("HIVE:MAP:HIDE_ALL_CATEGORIES");
    }

    showCategories(visibilities) {
        this._dispatch("HIVE:MAP:SET_CATEGORIES_VISIBILITY", { visibilities });
    }

    toggleCategories(categoryIds) {
        this._dispatch("HIVE:MAP:TOGGLE_CATEGORIES", { categoryIds });
    }

    setSelectedCategory(categoryId) {
        this._dispatch("HIVE:MAP:SET_SELECTED_CATEGORY", { selectedCategory: categoryId })
    }

    updateFoundLocationsCount(count = 0) {
        this._dispatch("HIVE:USER:UPDATE_FOUND_LOCATIONS_COUNT", { count })
    }

    addPreset(preset) {
        this._dispatch("HIVE:USER:ADD_PRESET", { preset });
    }

    removePreset(presetId) {
        this._dispatch("HIVE:USER:DELETE_PRESET", { presetId });
    }

    reorderPresets(ordering) {
        let presets = [];
        for (let preset of this.state.user.presets) {
            presets[ordering.indexOf(preset.id)] = preset;
        }
        this._dispatch("HIVE:USER:REORDER_PRESETS", { presets });
    }

    applyPreset(preset, additive) {
        this._dispatch("HIVE:MAP:APPLY_PRESET", { preset, additive });
    }

    unapplyPreset(preset) {
        this._dispatch("HIVE:MAP:UNAPPLY_PRESET", { preset });
    }

    setActivePresets(activePresets) {
        this._dispatch("HIVE:MAP:SET_ACTIVE_PRESETS", { activePresets });
    }

    showNotes(visible) {
        this._dispatch("HIVE:USER:SHOW_NOTES", { visible });
    }
}

module.exports = MGMapStore;