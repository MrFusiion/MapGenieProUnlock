const IS_MAP = window.mapData !== undefined && typeof store !== "undefined" && window.user !== undefined && window.axios !== undefined;

let TMP_MARK_CONTROLS = new Template("mark-controls",
    `<div class="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button class="mg-mark-all-control" type="button" title="Mark all" aria-label="Mark all" aria-disabled="false">
            <span class="mapboxgl-ctrl-icon ion-md-add-circle" aria-hidden="true"></span>
        </button>
        <button class="mg-unmark-all-control" type="button" title="UnMark all" aria-label="Unmark all" aria-disabled="false">
            <span class="mapboxgl-ctrl-icon ion-md-close-circle" aria-hidden="true"></span>
        </button>
    </div>
`, `
    button.mg-mark-all-control,
    button.mg-unmark-all-control {
        width: 40px;
        height: 40px;
        box-shadow: none!important;
        background-color: #fff!important;
    }

    .mg-mark-all-control .mapboxgl-ctrl-icon,
    .mg-unmark-all-control .mapboxgl-ctrl-icon {
        background: none!important;
        font-size: 24px;
        padding: 7px 6px;
    }
`, {
    markAll: ".mg-mark-all-control",
    unmarkAll: ".mg-unmark-all-control",
});

let TMP_TOTAL_PROGRESS = new Template("total-progress",
    `<div class="progress-item-wrapper">
        <div class="progress-item" id="total-progress" style="margin-right: 5%;">
            <span class="icon">100%</span>
            <span class="title"></span>
            <span class="counter">99999 / 99999</span>
            <div class="progress-bar-container">
                <div class="progress-bar" role="progressbar" style="width: 7%;"></div>
            </div>
        </div>
    </div>
    <hr>
`, "", {
    item: ".progress-item",
    icon: ".icon",
    counter: ".counter",
    bar: ".progress-bar"
});



class MGMap {
    constructor(window, mini = false) {
        if (!window.user) { console.error("User is not loggedin!"); return; }

        let foundLocations = window.store.getState().user.foundLocations;
        this.foundLocations = foundLocations && Object.values(foundLocations).length > 0 && foundLocations || {}
        this.foundLocationsCount = Object.keys(this.foundLocations).length;
        this.trackedCategories = {};
        this.presets = {};

        this.isMini = mini;

        this.user = window.user;
        this.map = window.map;
        this.mapManager = window.mapManager;
        this.store = window.store;
        this.game = window.game;
        this.mapData = window.mapData;
        this.document = window.document;
        this.axios = window.axios;

        this._storage = new MapStorage(this.game.id);
        this._storage.locations.onset = (id, found) => {
            this._markLocation(id, found || false);
            this.onlocationmark(id, found);
        }
        this._storage.categories.onset = (id, track) => {
            this.trackCategory(id, track || false);
            this.oncategorytrack(id, track);
        }

        this.user.hasPro = true;
        this.user.role = "admin";
        this.mapData.maxMarkedLocations = Infinity;

        // create wrapper for getState so we can overide some values
        let getState = this.store.getState;
        this.store.getState = () => {
            let state = getState();
            state.user.foundLocationsCount = this.foundLocationsCount;
            state.user.foundLocations = this.foundLocations;
            state.user.trackedCategories = Object.keys(this.trackedCategories).map((key) => parseInt(key));
            return state;
        }

        this.totalMarkers = this.mapData.locations.length;


        // Filter apicalls and instead save to localstorage
        defineFilter((type, action, id) => {
            let storage = this._storage[type];
            switch (action) {
                case "set":
                    storage.set(id, true);
                    break;
                case "remove":
                    storage.remove(id);
                    break
            }
            this._update();
            return Promise.resolve();
        }, {
            put: {
                "/api/v1/user/locations": (apicall) => ["locations", "set", getIdFromApiCall(apicall)]
            },
            post: {
                "/api/v1/user/categories": (_, data) => ["categories", "set", data.category]
            },
            delete: {
                "/api/v1/user/locations": (apicall) => ["locations", "remove", getIdFromApiCall(apicall)],
                "/api/v1/user/categories": (apicall) => ["categories", "remove", getIdFromApiCall(apicall)]
            }
        }, this.axios);


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
                this.totalProgress = TMP_TOTAL_PROGRESS.clone();
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
                    this.mapManager.setFoundLocationsShown(!this.toggleFound.classList.toggle("disabled"));
                });
            }

            // Add marker controls
            {
                let markControl = (found) => {
                    return () => {
                        this.markLocations(found, [...this._categories(undefined, true)].map(c => c.id));
                    }
                }

                this.markControls = TMP_MARK_CONTROLS.clone();
                this.markControls.markAll.addEventListener("click", markControl(true));
                this.markControls.unmarkAll.addEventListener("click", markControl(false));

                let ctrlBottomRight = this.document.querySelector(".mapboxgl-ctrl-bottom-right")
                ctrlBottomRight.insertBefore(
                    this.markControls.element,
                    ctrlBottomRight.querySelector("button.mapboxgl-ctrl-zoom-in").parentElement
                );
            }
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
        if (this.totalProgress) {
            let percent = this.foundLocationsCount / this.totalMarkers * 100;
            this.totalProgress.icon.textContent = `${percent.toFixed(2)}%`;
            this.totalProgress.counter.textContent = `${this.foundLocationsCount} / ${this.totalMarkers}`;
            this.totalProgress.bar.style.width = `${percent}%`;
        }

        if (this.toggleFound) { 
            this.toggleFound.innerHTML = `
                <i class="icon ui-icon-show-hide"></i>
                Found Locations(${this.foundLocationsCount})`
        }

        if (!this.mapManager.showFoundLocations) {
            this.mapManager.updateFoundLocationsStyle();
        }

        this.store.dispatch({ type: "HIVE:USER:UPDATE_FOUND_LOCATIONS_COUNT", meta: { count: 0 } }); // Force react update
    }


    _validLocation(id) {
        for (let location of this.mapData.locations) {
            if (location.id == id) {
                return true;
            }
        }
        return false;
    }

    *_locations(categories = undefined) {
        categories = categories && categories.map((category) => parseInt(category));
        for (let loc of Object.values(this.mapData.locations)) {
            if (!categories || categories.includes(loc.category_id)) {
                yield loc;
            }
        }
    }

    *_categories(locations=undefined, visible=undefined) {
        let wantCategories = locations && new Set(locations.map((loc) => loc.category_id));
        for (let cat of Object.values(this.mapData.categories)) {
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
        if (this._validLocation(id)) {
            if ((found && !this.foundLocations[id]) || (!found && this.foundLocations[id])) {
                if (found) {
                    this.foundLocationsCount++;
                    this.foundLocations[id.toString()] = true;
                } else {
                    this.foundLocationsCount--;
                    delete this.foundLocations[id.toString()];
                }
            }
            this.map.setFeatureState({ source: "locations-data", id: parseInt(id) }, { found: found });
            if (this.game.id === 80) this.map.setFeatureState({ source: "circle-locations-data", id: id }, { found: found });
        }
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
            this._storage.locations.set(id, found);
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
    trackCategory(id, track=true) {
        if ((track && !this.trackedCategories[id]) || (!track && this.trackedCategories[id])) {
            if (track) {
                this.trackedCategories[id] = true;
            } else {
                delete this.trackedCategories[id];
            }

            this.store.dispatch({
                type: track && "HIVE:USER:ADD_TRACKED_CATEGORY" || "HIVE:USER:REMOVE_TRACKED_CATEGORY",
                meta: { categoryId: parseInt(id) }
            });
        }
    }

    trackCategories(track = true, categories) {
        for (let cat of Object.keys(categories || this.mapData.categories)) {
            this.trackCategory(cat, track);
        }
    }

    showAllCategories() {
        this.store.dispatch({ type: "HIVE:MAP:SHOW_ALL_CATEGORIES" });
    }

    hideAllCategories() {
        this.store.dispatch({ type: "HIVE:MAP:HIDE_ALL_CATEGORIES" });
    }

    showCategories(categories) {
        this.hideAllCategories();
        this.store.dispatch({ type: "HIVE:MAP:SET_CATEGORIES_VISIBILITY", meta: { visibilities: categories } })
    }

    getCategoryId(id) {
        let loc = this.store.getState().map.locationsById[id];
        return loc && loc.category_id || undefined;
    }

    // // Apply Presets
    // applyPreset(id, additive) {
    //     this.store.dispatch({ type: "HIVE:MAP:APPLY_PRESET", meta: { preset: id, additive: additive} });
    // }


    // // Unapply Presets
    // unapplyPreset(id) {
    //     this.store.dispatch({ type: "HIVE:MAP:UNAPPLY_PRESET", meta: { preset: id } });
    // }


    // setActivePresets(presets) {
    //     this.store.dispatch({ type: "HIVE:MAP:SET_SELECTED_LOCATION", meta: {activePresets: presets} })
    // }


    //Load and Reload methods
    load() {
        if (!this.user) { return Promise.reject("User is not loggedin!"); }
        let data = this._storage.load();
        console.log(this.foundLocations);

        return new Promise((resolve) => {
            let handle = setInterval(() => {
                if (this.map._loaded) {
                    clearInterval(handle);
                    for (let loc of Object.keys(this.foundLocations)) {
                        this._markLocation(loc, false);
                    }
                    
                    for (let loc of Object.keys(data.locations)) {
                        this._markLocation(loc, true);
                    }
                    
                    for (let cat of Object.keys(data.categories)) {
                        this.trackCategory(parseInt(cat, 10));
                    }

                    this._update();

                    resolve();
                }
            }, 100);
        });
    }

    reload() {
        console.log("reload");
        let data = this._storage.load();
        let locations =  Object.assign({}, data.locations || {});
        let categories = Object.assign({}, data.categories || {});

        //for (let loc of Object.keys(state.user.foundLocations)) {
        for (let loc of Object.keys(this.foundLocations)) {
            if (!locations[loc]) {
                this._markLocation(loc, false);
            }
            delete locations[loc];
        }

        for (let cat of Object.values(this.trackedCategories)) {
            if (!categories[cat]) {
                this.trackCategory(cat, false);
            }
            delete categories[cat];
        }

        for (let loc of Object.keys(locations)) {
            this._markLocation(loc, true);
        }
        
        for (let cat of Object.keys(categories)) {
            this.trackCategory(parseInt(cat, 10));
        }

        this._update();
    }

    onlocationmark() {};
    oncategorytrack() {};
}


let map;
if (IS_MAP) {
    map = new MGMap(window);
    map.load().then(() => {
        console.log("Map hijacker loaded");
    });
}