const IS_MAP = window.mapData !== undefined && typeof store !== "undefined" && window.user !== undefined && window.axios !== undefined;

document.head.appendChild(document.createElement("style")).textContent = `
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
`

let TMP_MARK_CONTROLS = new Template(`
    <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button class="mg-mark-all-control" type="button" title="Mark all" aria-label="Mark all" aria-disabled="false">
            <span class="mapboxgl-ctrl-icon ion-md-add-circle" aria-hidden="true"></span>
        </button>
        <button class="mg-unmark-all-control" type="button" title="UnMark all" aria-label="Unmark all" aria-disabled="false">
            <span class="mapboxgl-ctrl-icon ion-md-close-circle" aria-hidden="true"></span>
        </button>
    </div>
`, {
    markAll: ".mg-mark-all-control",
    unmarkAll: ".mg-unmark-all-control",
});

let TMP_TOTAL_PROGRESS =  new Template(`
    <div class="progress-item-wrapper">
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
`, {
    icon: ".icon",
    counter: ".counter",
    bar: ".progress-bar"
});
    


class MGMap {
    constructor(window, mini=false) {
        if (!window.user) { console.error("User is not loggedin!"); return; }

        this.foundLocations = window.store.getState().user.foundLocations || {};
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

        this.user.hasPro = true;
        this.user.role = "admin";
        this.mapData.maxMarkedLocations = Infinity;

        let getState = this.store.getState;
        this.store.getState = () => {
            let state = getState();
            state.user.foundLocationsCount = this.foundLocationsCount;
            state.user.foundLocations = this.foundLocations;
            return state;
        }

        this.totalMarkers = this.mapData.locations.length;

        this.axios.put = newFilter({
            "/api/v1/user/locations": (apicall) => { this._storage("save", storage.TYPES.LOCATIONS, getIdFromApiCall(apicall)); }
        }, this.axios.put);

        this.axios.post = newFilter({
            "/api/v1/user/categories": (s, data) => { this._storage("save", storage.TYPES.CATEGORIES, data.category); },
            //"/api/v1/user/presets": (s, data) => { storage.save(storage.TYPES.PRESETS, data.title); }
        }, this.axios.post);

        this.axios.delete = newFilter({
            "/api/v1/user/locations": (apicall) => { this._storage("remove", storage.TYPES.LOCATIONS, getIdFromApiCall(apicall)); },
            "/api/v1/user/categories": (apicall) => { this._storage("remove", storage.TYPES.CATEGORIES, getIdFromApiCall(apicall)); },
            //"/api/v1/user/presets": (apicall) => { _storage(storage.TYPES.PRESETS, getIdFromApiCall(s)); }
        }, this.axios.delete);

        // Hide PRO Upgrade elements
        let selectors = ["#blobby-left", ".upgrade", ".progress-buttons ~ .inset"];
        for (let selector of Object.values(selectors)) {
            let element = this.document.querySelector(selector);
            if (element) {
                element.style.display = "none";
            }
        }

        if (mini) {
            let button = document.createElement("button");
            button.classList.add("btn", "btn-outline-secondary");
            button.style.marginLeft = "5px";
            button.addEventListener("click", this._showAll.bind(this));
            button.textContent = "Show All";

            let mapHeader = window.document.querySelector(".d-flex");
            mapHeader.appendChild(button);
        }

        if (!mini) { 
            this.document.addEventListener('visibilitychange', () => {
                if (this.document.visibilityState == "visible") {
                    this.reload();
                }
            });

            // Add total progress bar
            this.totalProgress = TMP_TOTAL_PROGRESS.clone();

            let userPanelDiv = this.document.querySelector("#user-panel > div:first-of-type");
            let categoryProgress = userPanelDiv.querySelector(".category-progress");
            userPanelDiv.insertBefore(this.totalProgress.element, categoryProgress);

            let totalProgress = userPanelDiv.querySelector("#total-progress.progress-item");
            totalProgress.addEventListener("click", this.showAllCategories.bind(this));


            let toggleFound = this.document.querySelector("#toggle-found");
            this.toggleFound = toggleFound.cloneNode(false);
            toggleFound.parentElement.append(this.toggleFound);
            toggleFound.style.display = "none";

            this.toggleFound.addEventListener("click", () => {
                $(this.toggleFound).toggleClass("disabled");
                this.mapManager.setFoundLocationsShown(!$(this.toggleFound).hasClass("disabled"));
            });

            this.markControls = TMP_MARK_CONTROLS.clone();
            this.markControls.markAll.addEventListener("click", () => {
                this.markLocations(true, [...this._categories(undefined, true)].map(c => c.id));
            });
            this.markControls.unmarkAll.addEventListener("click", () => {
                this.markLocations(false, [...this._categories(undefined, true)].map(c => c.id));
            });

            let ctrlBottomRight = this.document.querySelector(".mapboxgl-ctrl-bottom-right");
            let ctrlGroup = ctrlBottomRight.querySelector("button.mapboxgl-ctrl-zoom-in").parentElement;
            ctrlBottomRight.insertBefore(this.markControls.element, ctrlGroup);

            // Force react update
            this.hideAllCategories();
            this.showAllCategories();
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

    _storage(action, type, id, update=true) {
        switch (type) {
            case storage.TYPES.LOCATIONS:
                this._markLocation(id, action === "save", update);
                this.onlocationmark(id, action === "save");
                break;
            case storage.TYPES.CATEGORIES:
                this.trackCategory(id, action === "save", update);
                this.oncategorytrack(id, action === "save");
                break;
        }

        switch (action) {
            case "save":
                storage.save(type, id, this.game);
                break;
            case "remove":
                storage.remove(type, id, this.game);
                break;
        }

        return action === "save";
    }

    _showAll() {
        if (this.isMini) {
            if (this._categories) {
                this.showCategories(this._categories);
            } else {
                this.showAllCategories();
            }
        }
        return Promise.resolve();
    }

    _updateTotalProgress() {
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
    _markLocation(id, found=true, update=true) {
        id = parseInt(id);
        if (this._validLocation(id)) {
            if ((found && !this.foundLocations[id]) || (!found && this.foundLocations[id])) {
                if (found) {
                    this.foundLocationsCount++;
                    this.foundLocations[id] = true;
                } else {
                    this.foundLocationsCount--;
                    delete this.foundLocations[id];
                }
                this.map.setFeatureState({ source: "locations-data", id: parseInt(id) }, { found: found });
                if (this.game.id === 80) this.map.setFeatureState({ source: "circle-locations-data", id: id }, { found: found });
            }
            if (update) {
                if (!this.mapManager.showFoundLocations) {
                    this.mapManager.updateFoundLocationsStyle();
                }
                this._updateTotalProgress();
            }
        }
    }

    _markLocations(found=true, categories) {
        for (let loc of this._locations(categories)) {
            this._markLocation(loc.id, found, false);
        }
        this._updateTotalProgress();
    }

    // Public mark methods
    markLocation(id, found=true, update=true) {
        this._storage(found && "save" || "remove", storage.TYPES.LOCATIONS, id, false);
    }

    markLocations(found=true, categories) {
        for (let loc of this._locations(categories)) {
            this.markLocation(loc.id, found, false);
        }
        this._updateTotalProgress();
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

    trackCategories(track=true) {
        for (let cat of Object.keys(this.mapData.categories)) {
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
        let data = storage.load(null, this.game);

        return new Promise((resolve) => {
            let handle = setInterval(() => {
                if (this.map._loaded) {
                    clearInterval(handle);
                    for (let loc of Object.keys(this.foundLocations)) {
                        this._markLocation(loc, false, false);
                    }
                    
                    for (let loc of Object.keys(data.locations)) {
                        this._markLocation(loc, true, false);
                    }
                    
                    for (let cat of Object.keys(data.categories)) {
                        this.trackCategory(parseInt(cat, 10));
                    }

                    this._updateTotalProgress();

                    resolve();
                }
            }, 100);
        });
    }

    reload() {
        console.log("reload");
        let data = storage.load(null, this.game);
        let locations =  Object.assign({}, data.locations || {});
        let categories = Object.assign({}, data.categories || {});

        //for (let loc of Object.keys(state.user.foundLocations)) {
        for (let loc of Object.keys(this.foundLocations)) {
            if (!locations[loc]) {
                this._markLocation(loc, false, false);
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
            this._markLocation(loc, true, false);
        }
        
        for (let cat of Object.keys(categories)) {
            this.trackCategory(parseInt(cat, 10));
        }

        this._updateTotalProgress();
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