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
                state.user.foundLocationsCount  = storage.local.foundLocationsCount;
                state.user.foundLocations       = storage.data.locations;
                state.user.trackedCategories    = Object.keys(storage.data.categories).map((key) => parseInt(key));
            }
            return state;
        }
    }

    *locations(categories=undefined) {
        let locations = this.state.map.locations;
        for (let i in locations) {
            let loc = locations[i];
            if (!categories || categories.find(val => val == loc.category_id)) {
                yield loc;
            }
        }
    }

    *categories(locations=undefined, visible=undefined) {
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

    _dispatch(type, meta={}) {
        this.store.dispatch({ type, meta });
    }

    markLocation(id, found = true) {
        id = parseInt(id);
        this.#map.setFeatureState({ source: "locations-data", id }, { found });
        if (this.#gameid === 80) this.#map.setFeatureState({ source: "circle-locations-data", id }, { found });
    }

    markLocations(found = true, options = { categories: undefined, locations: undefined }) {
        let { categories, locations } = options;
        for (let loc of this.locations(options.categories)) {
            let correctCategory = !categories   || categories.find(val => val == loc.category_id);
            let correctLocation = !locations    || locations.find(val => val == loc.id);
            if (correctCategory && correctLocation) {
                this.markLocation(loc.id, found);;
            }
        }
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

    updateFoundLocationsCount(count=0) {
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
        this._dispatch("HIVE:MAP:SET_ACTIVE_PRESETS", { activePresets })
    }
}


class MGMapStorageChangeEvent extends Event {
    constructor(type, key, value) {
        super("change");
        this.type = type;
        this.key = key;
        this.oldValue = value;
        this.newValue = value;
    }
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

    constructor(window, autosave=true) {
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
        return globalThis;
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
        let data = deepAsign(MGMapStorage.default.data, storage.data || {});
        let settings = deepAsign(MGMapStorage.default.settings, storage.settings || {});
        this.data = objectSet(this.data || {}, data);
        this.settings = objectSet(this.settings || {}, settings)

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


class MGMapMarkEvent extends Event {
    constructor(type, id, marked) {
        super(type);
        this.id = id;
        this.marked = marked;
    }
}


class MGMap {
    #eventTarget = new EventTarget();
    #categories; #isMini; #storage;
    #storageFilter; #apiFilter;

    constructor(window, mini = false) {
        if (!window.user) { throw "User is not loggedin!"; }

        this.#isMini    = mini;
        this.window     = window;
        this.document   = this.window.document;
        this.id = this.window.mapData.map.id;

        this.window.user.hasPro = true;
        this.window.mapData.maxMarkedLocations = 9e10;

        this.#storage = new MGMapStorage(this.window);
        this.store = new MGMapStore(this.window, this.#storage);

        this.#storageFilter = new MGStorageFilter(this.window);
        this.#storageFilter.set = (key, match) => {
            if (key === "visible_categories") {
                let id = match.match(/(\d+)$/)[1];
                this.#storage.updateData(data => {
                    data.visible_categories[id] = true;
                    return data;
                });
            } else if (key === "remember_categories") {
                this.#storage.updateSettings(settings => {
                    settings.remember_categories = true;
                    return settings;
                });
            }
            return false;
        }
        this.#storageFilter.remove = (key, match) => {
            if (key === "visible_categories") {
                let id = match.match(/(\d+)$/)[1]; 
                this.#storage.updateData(data => {
                    delete data.visible_categories[id];
                    return data;
                });
            } else if (key === "remember_categories") {
                this.#storage.updateSettings(settings => {
                    settings.remember_categories = false;
                    return settings;
                });
                this.#storage.update(({ settings, data }) => {
                    settings.remember_categories = false;
                    for (let key in data.visible_categories) delete data.visible_categories[key];
                    return { settings, data };
                });
            }
            return false;
        }

        this.#apiFilter = new MGApiFilter(this.window.axios);
        this.#apiFilter.set = (key, id, postData) => {
            switch (key) {
                case "locations":
                    let isFound = this.#storage.data.locations[id] || false;
                    if (!isFound) this.#storage.local.foundLocationsCount++;
                    this._update();
                case "categories":
                    id = postData && postData.category || id;
                    this.#storage.updateData(data => {
                        data[key][id] = true;
                        return data;
                    });
                    this.#eventTarget.dispatchEvent(new MGMapMarkEvent(`mark-${key}`, id, true));
                    break;
                case "presets":
                    this.#storage.updateData(data => {
                        let id = 0;
                        for (let i in data.presets) {
                            if (id != i) break;
                            id++;
                        }
                        postData = { data: Object.assign({ id: id }, postData) };
                        data.presets[id] = postData.data;
                        data.presets_order.push(id)
                        return data;
                    });
                    break;
                case "presets/reorder":
                    this.#storage.updateData(data => {
                        data.presets_order = postData.ordering;
                        return data;
                    });
                    break;
            }
            return postData;
        }
        this.#apiFilter.remove = (key, id, data) => {
            switch (key) {
                case "locations":
                    let isFound = this.#storage.data.locations[id] || false;
                    if (isFound) this.#storage.local.foundLocationsCount--;
                    this._update();
                case "categories":
                    this.#storage.updateData(data => {
                        delete data[key][id];
                        return data;
                    });
                    this.#eventTarget.dispatchEvent(new MGMapMarkEvent(`mark-${key}`, id, false));;
                    break;
                case "presets":
                    this.#storage.updateData(data => {
                        let index = data.presets_order.indexOf(id);
                        if (index !== -1) data.presets_order.splice(index, 1);
                        delete data.presets[id];
                        return data;
                    });
                   break;
            }
            return data;
        }

        if (mini) {
            $(`<button class="btn btn-outline-secondary" style="margin-left: 5px;">Show All</button>`)
                .click(this.showAll.bind(this)).appendTo($(this.window.document).find("#mini-header .d-flex"));
        } else {
            // Add total progress bar
            let $totalProgress = $(`
                <div class="progress-item-wrapper">
                    <div class="progress-item" id="total-progress" style="margin-right: 5%;">
                        <span class="icon">0.00%</span>
                        <span class="title"></span>
                        <span class="counter">0/0</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar" role="progressbar" style="width: 0%;"></div>
                        </div>
                    </div>
                </div>
                <hr>`);

            $totalProgress.insertBefore($(this.window.document).find("#user-panel > div:first-of-type .category-progress"));
            $totalProgress.find(".progress-item").click(this.store.showAllCategories.bind(this.store));

            this.totalProgress = {
                icon    : $totalProgress.find(".icon").get(0),
                counter : $totalProgress.find(".counter").get(0),
                bar     : $totalProgress.find(".progress-bar").get(0),
            }

            // Add toggle found button
            $(this.window.document).find("#toggle-found").hide();
            this.toggleFound = $(`<span id="toggle-found" class="button-toggle"><i class="icon ui-icon-show-hide"></i>Found Locations (0)</span>`)
                .insertAfter($(this.window.document).find("#toggle-found"))
                .click(() => {
                    this.window.mapManager.setFoundLocationsShown(!this.toggleFound.classList.toggle("disabled"));
                })
                .get(0);

            // Add marker controls
            let markControl = (found) => {
                return () => {
                    let c = 0;
                    this.#storage.updateData(data => {
                        for (let loc of this.store.state.map.locations) {
                            if (loc.category.visible) {
                                if (found && !data.locations[loc.id]) {
                                    c++;
                                    data.locations[loc.id] = true;
                                } else if (data.locations[loc.id]) {
                                    c--;
                                    delete data.locations[loc.id];
                                }
                                this.store.markLocation(loc.id, found);
                            }
                        }
                        return data;
                    });
                    this.#storage.local.foundLocationsCount += c;
                    this._update();
                }
            }

            let $markControls = $(`
                <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
                    <button class="mg-mark-all-control" type="button" title="Mark all" aria-label="Mark all" aria-disabled="false">
                        <span class="mapboxgl-ctrl-icon ion-md-add-circle" aria-hidden="true"></span>
                    </button>
                    <button class="mg-unmark-all-control" type="button" title="UnMark all" aria-label="Unmark all" aria-disabled="false">
                        <span class="mapboxgl-ctrl-icon ion-md-close-circle" aria-hidden="true"></span>
                    </button>
                </div>`);

            $markControls.insertAfter($(this.window.document).find("#add-note-control"));
            $markControls.find(".mg-mark-all-control").click(markControl(true));
            $markControls.find(".mg-unmark-all-control").click(markControl(false));
        }
    }

    set categories(categories) {
        if (typeof (categories) === "string") {
            this.#categories = { [categories]: true };
        } else if (typeof (categories) === "object") {
            this.#categories = Object.assign({}, 
                                    ...categories.map((category) => ({ [category]: true })));
        } else {
            this.#categories = undefined;
        }
    }

    showAll() {
        if (this.#isMini) {
            this.store.hideAllCategories();
            if (this.#categories) {
                this.store.showCategories(this.#categories);
            } else {
                this.store.showAllCategories();
            }
        }
    }

    _update() {
        let count = this.#storage.local.foundLocationsCount;
        let total = this.window.mapData.totalLocations
            || (this.window.mapData.totalLocations = Object.keys(this.store.state.map.locations).length);

        if (this.totalProgress) {
            let percent = count / total * 100;
            this.totalProgress.icon.textContent     = `${percent.toFixed(2)}%`;
            this.totalProgress.counter.textContent  = `${count} / ${total}`;
            this.totalProgress.bar.style.width      = `${percent}%`;
        }

        if (this.toggleFound) { 
            this.toggleFound.innerHTML = `
                <i class="icon ui-icon-show-hide"></i>
                Found Locations(${count})
            `;
        }

        if (!this.window.mapManager.showFoundLocations) {
            this.window.mapManager.updateFoundLocationsStyle();
        }

        this.store.updateFoundLocationsCount(0); // Force react update
        this.store.toggleCategories([]); // Force react update
    }

    getCategoryId(id) {
        let loc = this.store.state.map.locationsById[id];
        return loc && loc.category_id || undefined;
    }

    setRememberCategories(value) {
        let $label = $(this.window.document).find("label[for='remember-categories-checkbox']");
        let $div = $label.closest(".checkbox-wrapper")
        let image = this.window.getComputedStyle($label.get(0), ":after").webkitMaskImage;
        let checked = image != "none" && image != "";
        if ((value || false) != checked) {
            $div.click();
        }
    }

    load() {
        return new Promise((resolve) => {
            this.#storage.load();
            if (this.window.map.loaded()) resolve();
            else {
                let handle = setInterval(() => {
                    if (this.window.map.loaded()) {
                        clearInterval(handle);
                        resolve();
                    }
                }, 50);
            }
        }).then(() => {
            this.store.markLocations(false);
            for (let loc in this.#storage.data.locations) {
                this.store.markLocation(loc, true);
            }

            if (!this.#isMini) {
                this.store.trackCategories(false);
                for (let cat in this.#storage.data.categories) {
                    this.store.trackCategory(cat, true);
                }

                if (this.#storage.settings.remember_categories) {
                    this.#storage.autosave = false;
                    let visibleCategories = Object.assign({}, this.#storage.data.visible_categories);
                    this.store.hideAllCategories();
                    this.setRememberCategories(true);
                    this.store.showCategories(visibleCategories);
                    this.#storage.autosave = true;
                } else {
                    this.setRememberCategories(false);
                }

                let curPresets = this.store.state.user.presets;
                let presets = Object.values(this.#storage.data.presets);
                for (let preset of curPresets) {
                    this.store.removePreset(preset.id);
                }
                for (let preset of presets) {
                    this.store.addPreset(preset);
                }
                if (this.#storage.data.presets_order.length > 0) {
                    this.store.reorderPresets(this.#storage.data.presets_order);
                }
            }

            this._update();
        });
    }

    on(type, callback) {
        return this.#eventTarget.addEventListener(type, callback);
    }

    off(type) { 
        return this.#eventTarget.removeEventListener(type, callback);
    }
}


let mgMap
if (window.store) {
    if (!window.mg_pro_unlocker_loaded) {
        this.window.toastr.error("MapGeniePro Unlock:\nExtension was to slow to enable presets, please try again.");
    }

    mgMap = new MGMap(window);
    mgMap.load().then(() => {
        console.log("Map hijacker loaded");

        // Listen for page focus
        this.document.addEventListener('visibilitychange', () => {
            if (this.document.visibilityState == "visible") {
                mgMap.load();
            }
        });
    });
}