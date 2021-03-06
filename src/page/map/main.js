const MGMapStore = require("./store");
const MGMapStorage = require("./storage");
const { MGStorageFilter, MGApiFilter } = require("../filters");
const PopupObserver = require("./popupObserver");

//Handlers
const ApiHandler = require("../api");
const StorageHandler = require("./storageHandler");

//UI
const MarkControls = require("./ui/markControls");
const TotalProgress = require("./ui/totalProgress");
const ToggleFound = require("./ui/toggleFound");


class MGMapMarkEvent extends Event {
    constructor(type, id, marked) {
        super(type);
        this.id = id;
        this.marked = marked;
    }
}


function toggle(dict, key) {
    if (dict[key]) {
        delete dict[key];
        return false;
    } else {
        dict[key] = true;
        return true;
    }
}


class MGMap {
    #eventTarget = new EventTarget();
    #categories; #isMini; #storage;

    constructor(window, mini = false) {
        if (!window.user) { throw "User is not loggedin!"; }

        this.#isMini = mini;
        this.window = window;
        this.document = this.window.document;
        this.id = this.window.mapData.map.id;
        this._popup = null;

        sessionStorage.setItem("game_title", window.game.title);
        sessionStorage.setItem("gameid", window.game.id);
        sessionStorage.setItem("userid", window.user.id);

        this.window.user.hasPro = true;
        this.window.mapData.maxMarkedLocations = 9e10;

        this.#storage = new MGMapStorage(this.window);
        this.store = new MGMapStore(this.window, this.#storage);

        const storageHandler = new StorageHandler(this.#storage);
        this.storageFilter = new MGStorageFilter(this.window.localStorage, storageHandler);

        const apiHandler = new ApiHandler(this.store, this.#storage);
        this.apiFilter = new MGApiFilter(this.window.axios, apiHandler);

        apiHandler.put.on("locations", ({ id }) => {
            this.store.markLocation(id, true);
            this._update();
            this.#eventTarget.dispatchEvent(new MGMapMarkEvent(`mark-locations`, id, true));
        });
        
        apiHandler.delete.on("locations", ({ id }) => {
            this.store.markLocation(id, false);
            this._update();
            this.#eventTarget.dispatchEvent(new MGMapMarkEvent(`mark-locations`, id, false));
        });

        apiHandler.put.on("categories", ({ id }) => {
            this.#eventTarget.dispatchEvent(new MGMapMarkEvent(`mark-categories`, id, true));
        })

        apiHandler.delete.on("categories", ({ id }) => {
            this.#eventTarget.dispatchEvent(new MGMapMarkEvent(`mark-categories`, id, false));
        })

        if (mini) {
            $(`<button class="btn btn-outline-secondary" style="margin-left: 5px;">Show All</button>`)
                .click(this.showAll.bind(this)).appendTo($(this.window.document).find("#mini-header .d-flex"));
            return;
        }

        //Create total progress element on the right
        this.totalProgress = new TotalProgress(this.window);

        //Overwrite togglefound element provided by mapgenie because it doesn't show the correct count
        this.toggleFound = new ToggleFound(this.window);

        //Observe if popup gets added and listen when clicked
        this.popupObserver = new PopupObserver(this.store);
        this.popupObserver.click((e) => {
            const id = e.locId;
            this.#storage.updateData((data) => {
                const found = toggle(data.locations, id);
                this.store.markLocation(id, found);
                this.#storage.local.foundLocationsCount += found ? 1 : -1;
                return data;
            })
            this._update();
        });
        this.popupObserver.observe(this.window);

        //Add marker controls at the right corner of the map
        // 1 markAll: Marks all visible markers
        // 2 unmarkAll: Unmarks all visible markers
        this.markControls = new MarkControls(this.window);
        this.markControls.click((found) => {
            //Confirm if the user want's to unmark or mark all visible markers
            let ans = confirm(`Are you sure you want to ${!found && "un" || ""}mark all visible markers on the map?`);
            if (!ans) return;

            //Count how many markers are mark or unmarked
            this.#storage.updateData(data => {
                for (let loc of this.store.state.map.locations) {
                    if (loc.category.visible) {
                        if (found && !data.locations[loc.id]) {
                            this.#storage.local.foundLocationsCount++;
                            data.locations[loc.id] = true;
                        } else if (!found && data.locations[loc.id]) {
                            this.#storage.local.foundLocationsCount--;
                            delete data.locations[loc.id];
                        }
                        this.store.markLocation(loc.id, found);
                    }
                }
                return data;
            });
            this._update();
        });
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
        //We don't have to update the UI if the map is in mini mode
        if (this.#isMini) return;

        const count = this.#storage.local.foundLocationsCount;
        const total = this.window.mapData.totalLocations
            || (this.window.mapData.totalLocations = Object.keys(this.store.state.map.locations).length);
        
        
        //Update totalProress and togglefound counter
        this.totalProgress.update(count, total);
        this.toggleFound.update(count);

        //Update mapManager
        this.window.mapManager.updateFoundLocationsStyle?.();

        //Update popup
        const popup = this.popupObserver.currentPopup;
        this.popupObserver.currentPopup?.update(this.store.isMarked(popup?.locId));
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

    init() {
        //Get initial locations and categories
        const visibleLocations = this.window.visibleLocations;
        const visibleCategories = this.window.visibleCategories;

        //Do react update
        this.store.toggleCategories([]); // Force react update
        this.store.updateFoundLocationsCount(0); // Force react update

        //Load map data then restore initial locations and categories
        return this.load().then(() => {
            if (visibleLocations || visibleCategories) {
                this.window.mapManager.applyFilter({
                    locationIds: visibleLocations && Object.keys(visibleLocations || {}).map(parseInt),
                    categoryIds: visibleCategories && Object.keys(visibleCategories || {}).map(parseInt)
                })
            }
        });
    }

    load() {
        return new Promise((resolve) => {
            //Retrieve localstorage data
            this.#storage.load();

            //Wait until map is loaded the resolve
            if (this.window.map.loaded())
                resolve();
            else {
                let handle = setInterval(() => {
                    if (this.window.map.loaded()) {
                        clearInterval(handle);
                        resolve();
                    }
                }, 50);
            }
        }).then(() => {
            //Unmark all non-stored locations
            this.store.markLocations(false);

            //Mark all stored locations
            for (let loc in this.#storage.data.locations) {
                this.store.markLocation(loc, true);
            }

            //Only do this if the map is not in mini mode
            if (!this.#isMini) {

                //Untrack all non-stored categories
                this.store.trackCategories(false);

                //Track all stored categores
                for (let cat in this.#storage.data.categories) {
                    this.store.trackCategory(cat, true);
                }


                //If remember categories is true load last visible categories
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

                //Remove non-stored presets except for the default one;
                let curPresets = this.store.state.user.presets;
                let presets = Object.values(this.#storage.data.presets);
                if (curPresets[0]) {
                    for (let preset of curPresets) {
                        this.store.removePreset(preset.id);
                    }
                    this.store.addPreset(curPresets[0]);
                }

                //Add stored presets
                for (let preset of presets) {
                    this.store.addPreset(preset);
                }

                //Order presets
                if (this.#storage.data.presets_order.length > 0) {
                    this.store.reorderPresets(this.#storage.data.presets_order);
                }
            }

            //Update map
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


module.exports = { MGMap }