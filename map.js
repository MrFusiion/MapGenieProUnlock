class MGMap {
    static parseId(str) { return parseInt(str.match("/\\d+")[0].match("\\d+")[0], 10); }

    constructor(window, mini = false) {
        if (!window.user) { console.error("User is not loggedin!"); return; }

        this.presets = {};

        this.isMini = mini;
        this.window = window;
        this.document = window.document;

        this._storage = new MapStorage(window.game.id);
        this._storage.locations.onset = (id, found) => {
            this._markLocation(id, found || false);
            this.onlocationmark(id, found);
        }
        this._storage.categories.onset = (id, track) => {
            this._trackCategory(id, track || false);
            this.oncategorytrack(id, track);
        }
        this._storage.presets.onset = (_, preset) => {
            if (!preset)
                this._storage.presets_ordering.set(this.presetOrdering);
        }
        this._settings = new MapSettingsStorage(window.game.id);

        window.user.hasPro = true;
        window.user.role = "admin";
        window.mapData.maxMarkedLocations = Infinity;

        // create wrapper for getState so we can overide some values
        let getState = window.store.getState;
        window.store.getState = () => {
            let state = getState();
            state.user.foundLocationsCount = this._storage.locations.count;
            state.user.foundLocations = this._storage.locations.get();
            state.user.trackedCategories = this._storage.categories.keys.map((key) => parseInt(key));
            return state;
        }

        this.totalMarkers = this.window.mapData.locations.length;


        // Filter apicalls and instead save to localstorage
        defineFilter((type, action, id, data) => {

            if (data) {
                if (!data.id && !data.title) {
                    data = data.ordering;
                    type = "presets_ordering";
                } else {
                    data = { id: id, title: data.title, categories: data.categories};
                }
            }

            let storage = this._storage[type];
            switch (action) {
                case "set":
                    switch (type) {
                        case "presets":
                            storage.set(id, data);
                            break;
                        case "presets_ordering":
                            storage.set(data);
                            break;
                        default:
                            storage.set(id, true);
                    }
                    break;
                case "remove":
                    switch (type) {
                        case "presets":
                            storage.remove(id);
                            break;
                        default:
                            storage.remove(id);
                    }
                    break
            }
            this._update();

            return Promise.resolve({data: data });
        }, {
            put: {
                "/api/v1/user/locations": (apicall) => ["locations", "set", MGMap.parseId(apicall)]
            },
            post: {
                "/api/v1/user/categories":      (_, data) => ["categories",         "set", data.category],
                "/api/v1/user/presets":         (_, data) => ["presets",            "set", this.window.store.getState().user.presets.length-1, data],
                //"/api/v1/user/presets/reorder": (_, data) => ["reorder-presets",    "set", "", data],
            },
            delete: {
                "/api/v1/user/locations":   (apicall) => ["locations",  "remove", MGMap.parseId(apicall)],
                "/api/v1/user/categories":  (apicall) => ["categories", "remove", MGMap.parseId(apicall)],
                "/api/v1/user/presets":     (apicall) => ["presets",    "remove", MGMap.parseId(apicall)],
            }
        }, window.axios);


        if (mini) {
            let button = document.createElement("button");
            button.classList.add("btn", "btn-outline-secondary");
            button.style.marginLeft = "5px";
            button.addEventListener("click", this.showAll.bind(this));
            button.textContent = "Show All";

            let mapHeader = window.document.querySelector(".d-flex");
            mapHeader.appendChild(button);
        }

        if (!mini) {
            // Hide PRO Upgrade elements
            hideAll(["#blobby-left", ".upgrade", ".progress-buttons ~ .inset"]);

            // Listen for page focus
            this.document.addEventListener('visibilitychange', () => {
                if (this.document.visibilityState == "visible") {
                    this.reload();
                }
            });

            // Add total progress bar
            {
                this.totalProgress = Templates.total_progress.clone();
                let userPanelDiv = this.document.querySelector("#user-panel > div:first-of-type");
                userPanelDiv.insertBefore(
                    this.totalProgress.element,
                    userPanelDiv.querySelector(".category-progress")
                );
                this.totalProgress.item.addEventListener("click", this.showAllCategories.bind(this));
            }

            // Add toggle found button
            { 
                let oldToggleFound = this.document.querySelector("#toggle-found");
                this.toggleFound = oldToggleFound.cloneNode(false);
                oldToggleFound.style.display = "none";
                oldToggleFound.parentElement.append(this.toggleFound);

                this.toggleFound.addEventListener("click", () => {
                    this.window.mapManager.setFoundLocationsShown(!this.toggleFound.classList.toggle("disabled"));
                });
            }

            // Add marker controls
            {
                let markControl = (found) => 
                    () => this.markLocations(found, [...this._categories(undefined, true)].map(c => c.id));

                this.markControls = Templates.mark_controls.clone();
                this.markControls.markAll.addEventListener("click", markControl(true));
                this.markControls.unmarkAll.addEventListener("click", markControl(false));

                let ctrlBottomRight = this.document.querySelector(".mapboxgl-ctrl-bottom-right")
                ctrlBottomRight.insertBefore(
                    this.markControls.element,
                    ctrlBottomRight.querySelector("button.mapboxgl-ctrl-zoom-in").parentElement
                );
            }

            store.dispatch({ type: "HIVE:MAP:TOGGLE_CATEGORIES", meta: { categoryIds: [] }}); // Force react update
        }
    }

    set categories(categories) {
        if (typeof (categories) === "string") {
            this._categories = { [categories]: true };
        } else if (typeof (categories) === "object") {
            this._categories = Object.assign({}, 
                                    ...categories.map((category) => ({ [category]: true })));
        } else {
            delete this._categories;
        }
    }

    showAll() {
        if (this.isMini) {
            if (this._categories) {
                this.showCategories(this._categories);
            } else {
                this.showAllCategories();
            }
        }
    }

    _update() {
        let count = this._storage.locations.count;

        if (this.totalProgress) {
            let percent = count / this.totalMarkers * 100;
            this.totalProgress.icon.textContent     = `${percent.toFixed(2)}%`;
            this.totalProgress.counter.textContent  = `${count} / ${this.totalMarkers}`;
            this.totalProgress.bar.style.width      = `${percent}%`;
        }

        if (this.toggleFound) { 
            this.toggleFound.innerHTML = `
                <i class="icon ui-icon-show-hide"></i>
                Found Locations(${count})`
        }

        if (!this.window.mapManager.showFoundLocations) {
            this.window.mapManager.updateFoundLocationsStyle();
        }

        this.window.store.dispatch({ type: "HIVE:USER:UPDATE_FOUND_LOCATIONS_COUNT", meta: { count: 0 } }); // Force react update
    }

    _validLocation(id) {
        for (let location of this.window.mapData.locations) {
            if (location.id == id) {
                return true;
            }
        }
        return false;
    }

    *_locations(categories = undefined) {
        categories = categories && categories.map((category) => parseInt(category));
        for (let loc of Object.values(this.window.mapData.locations)) {
            if (!categories || categories.includes(loc.category_id)) {
                yield loc;
            }
        }
    }

    *_categories(locations=undefined, visible=undefined) {
        let wantCategories = locations && new Set(locations.map((loc) => loc.category_id));
        for (let cat of Object.values(this.window.mapData.categories)) {
            if (!locations || wantCategories.has(cat.id)) {
                if (visible === undefined || cat.visible == visible) {
                    yield cat;
                }
            }
        }
    }

    // Private mark methods
    _markLocation(id, found = true) {
        id = parseInt(id);
        //if (this._validLocation(id)) {
        this.window.map.setFeatureState({ source: "locations-data", id: id }, { found: found });
        if (this.window.game.id === 80) this.window.map.setFeatureState({ source: "circle-locations-data", id: id }, { found: found });
        //}
    }

    _markLocations(found=true, categories) {
        for (let loc of this._locations(categories)) {
            this._markLocation(loc.id, found);
        }
        this._update();
    }

    // Public mark methods
    markLocation(id, found = true, update = true) {
        if (found) {
            this._storage.locations.set(id, true);
        } else {
            this._storage.locations.remove(id);
        }
        if (update) this._update();
    }

    markLocations(found = true, categories) {
        this._storage.autosave = false;
        for (let loc of this._locations(categories)) {
            this.markLocation(loc.id, found, false);
        }
        this._update();
        this._storage.save();
        this._storage.autosave = true;
    }

    // Categories
    _trackCategory(id, track=true) {
        this.window.store.dispatch({
            type: track && "HIVE:USER:ADD_TRACKED_CATEGORY" || "HIVE:USER:REMOVE_TRACKED_CATEGORY",
            meta: { categoryId: parseInt(id) }
        });
    }

    _trackCategories(track = true, categories) {
        for (let cat of Object.keys(categories || this.window.mapData.categories)) {
            this._trackCategory(cat, track);
        }
    }

    showAllCategories() {
        this.window.store.dispatch({ type: "HIVE:MAP:SHOW_ALL_CATEGORIES" });
    }

    hideAllCategories() {
        this.window.store.dispatch({ type: "HIVE:MAP:HIDE_ALL_CATEGORIES" });
    }

    showCategories(categories) {
        this.window.store.dispatch({ type: "HIVE:MAP:SET_CATEGORIES_VISIBILITY", meta: { visibilities: categories } })
    }

    getCategoryId(id) {
        let loc = this.window.store.getState().map.locationsById[id];
        return loc && loc.category_id || undefined;
    }

    // Presets
    _addPreset(preset) {
        this.window.store.dispatch({ type: "HIVE:USER:ADD_PRESET", meta: { preset: preset } });
    }

    _removePreset(id) {
        this.window.store.dispatch({ type: "HIVE:USER:DELETE_PRESET", meta: { presetId: id } });
    }

    reorderPresets(ordering) {
        let reorderedPresets = [];
        for (let preset of this.window.store.getState().user.presets) {
            reorderedPresets[ordering.indexOf(preset.id)] = preset;
        }
        this.window.store.dispatch({ type: "HIVE:USER:REORDER_PRESETS", meta: { presets: reorderedPresets } });
    }

    applyPreset(id, additive) {
        this.window.store.dispatch({ type: "HIVE:MAP:APPLY_PRESET", meta: { preset: id, additive: additive} });
    }

    unapplyPreset(id) {
        this.window.store.dispatch({ type: "HIVE:MAP:UNAPPLY_PRESET", meta: { preset: id } });
    }

    setActivePresets(presets) {
        this.window.store.dispatch({ type: "HIVE:MAP:SET_ACTIVE_PRESETS", meta: {activePresets: presets} })
    }

    get presetOrdering() {
        let ordering = [];
        let presetIds = this._storage.presets.values.map((preset) => preset.id);
        for (let presetId of this.window.store.getState().user.presets.map((preset) => preset.id)) {
            if (presetId === -1 || presetIds.includes(presetId))
                ordering.push(presetId);
        }
        return ordering.length < 2 && [] || ordering
    }

    //Load and Reload methods
    load() {
        if (!this.window.user) { return Promise.reject("User is not loggedin!"); }
        let data = this._storage.load();

        return new Promise((resolve) => {
            let handle = setInterval(() => {
                if (this.window.map._loaded) {
                    clearInterval(handle);
                    for (let loc of Object.keys(this.window.user.locations || {})) {
                        this._markLocation(loc, false);
                    }
                    
                    for (let loc of Object.keys(data.locations)) {
                        this._markLocation(loc, true);
                    }
                    
                    for (let cat of Object.keys(data.categories)) {
                        this._trackCategory(parseInt(cat, 10));
                    }

                    // Load visible categories
                    if (!this.isMini && this._settings.remember_categories)
                        this.showCategories(this._settings.visible_categories.get());

                    for (let preset of this._storage.presets.values)
                        this._addPreset(preset);
                    let ordering = this._storage.presets_ordering.get();
                    if (ordering)
                        this.reorderPresets(ordering);
                        
                    this._update();

                    resolve();
                }
            }, 100);
        });
    }

    reload() {
        let data = this._storage.load();
        let locations =  Object.assign({}, data.locations || {});
        let categories = Object.assign({}, data.categories || {});

        for (let loc of this._storage.locations.keys) {
            if (!locations[loc]) {
                this._markLocation(loc, false);
            }
            delete locations[loc];
        }

        for (let cat of this._storage.categories.values) {
            if (!categories[cat]) {
                this._trackCategory(cat, false);
            }
            delete categories[cat];
        }

        for (let loc of Object.keys(locations)) {
            this._markLocation(loc, true);
        }
        
        for (let cat of Object.keys(categories)) {
            this._trackCategory(parseInt(cat, 10));
        }

        this._update();
    }

    onlocationmark() {};
    oncategorytrack() {};
}


const IS_MAP = window.mapData !== undefined && typeof store !== "undefined" && window.user !== undefined && window.axios !== undefined;

let map;
if (IS_MAP) {
    map = new MGMap(window);
    map.load().then(() => {
        console.log("Map hijacker loaded");
    });

    // let section = Templates.section.clone({
    //     category: "settings",
    //     name: "Settings"
    // });

    // let checkbox = Templates.checkbox.clone({
    //     category: "settings",
    //     label: "Remember Selected Categories",
    //     id: "remember-categories-checkbox"
    // });

    // let checkbox2 = Templates.checkbox.clone({
    //     category: "settings",
    //     label: "Apple",
    //     id: "remember-categories-checkbox"
    // });

    // section.body.appendChild(checkbox.element);
    // section.body.appendChild(checkbox2.element);
    // document.querySelector("ul#categories").appendChild(section.element);
}