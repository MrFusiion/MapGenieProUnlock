const MGMapStore = require("./store");
const MGMapStorage = require("./storage");
const { MGStorageFilter, MGApiFilter } = require("../filters");
const PopupObserver = require("./popupObserver");

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


class MGMap {
    #eventTarget = new EventTarget();
    #categories; #isMini; #storage;
    #storageFilter; #apiFilter;

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

        this.#storageFilter = new MGStorageFilter(this.window);
        this.#storageFilter.set = (key, match) => {
            // console.log("Set", key, match)
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
            // console.log("Remove", key, match)
            if (key === "visible_categories") {
                let id = match.match(/(\d+)$/)[1];
                this.#storage.updateData(data => {
                    // console.log(data.visible_categories);
                    delete data.visible_categories[id];
                    return data;
                });
            } else if (key === "remember_categories") {
                this.#storage.update(({ settings, data }) => {
                    // console.log(settings, data);
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
                    this._toggleLocation(id);
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
                        if (data.presets_order.length == 0) data.presets_order.push(-1);
                        data.presets_order.push(id);
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
                    this._toggleLocation(id);
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
                        if (data.presets_order.length == 1) data.presets_order = []
                        delete data.presets[id];
                        return data;
                    });
                    break;
            }
            return data;
        }

        if (mini) {
            //Add show all button on guide map
            $(`<button class="btn btn-outline-secondary" style="margin-left: 5px;">Show All</button>`)
                .click(this.showAll.bind(this)).appendTo($(this.window.document).find("#mini-header .d-flex"));
        } else {

            //Create total progress element on the right
            this.totalProgress = new TotalProgress(this.window);

            //Overwrite togglefound element provided by mapgenie because it doesn't show the correct count
            this.toggleFound = new ToggleFound(this.window);

            //Observe if popup gets added and listen when clicked
            this.popupObserver = new PopupObserver(this.store);
            this.popupObserver.click((e) => {
                this._toggleLocation(e.locId);
                this._update();
            });
            this.popupObserver.observe(this.window);

            //Add marker controls at the right corner of the map
            // 1 markAll: Marks all visible markers
            // 2 unmarkAll: Unmarks all visible markers
            this.markControls = new MarkControls(this.window);
            this.markControls.click((found) => {
                let ans = confirm(`Are you sure you want to ${!found && "un" || ""}mark all visible markers on the map?`);
                if (!ans) return;

                let c = 0;
                this.#storage.updateData(data => {
                    for (let loc of this.store.state.map.locations) {
                        if (loc.category.visible) {
                            if (found && !data.locations[loc.id]) {
                                c++;
                                data.locations[loc.id] = true;
                            } else if (!found && data.locations[loc.id]) {
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
            });
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

    _toggleLocation(id) {
        const found = !this.store.isMarked(id);
        this.store.markLocation(id, found);
        this.#storage.updateData(data => {
            if (found && !data.locations[id]) {
                data.locations[id] = true;
                this.#storage.local.foundLocationsCount += 1;
            } else if (!found && data.locations[id]) {
                delete data.locations[id];
                this.#storage.local.foundLocationsCount -= 1;
            }
            return data;
        });
    }

    _update() {
        const count = this.#storage.local.foundLocationsCount;
        const total = this.window.mapData.totalLocations
            || (this.window.mapData.totalLocations = Object.keys(this.store.state.map.locations).length);
        
        //Update totalProress and togglefound counter
        this?.totalProgress.update(count, total);
        this?.toggleFound.update(count);

        //Update mapManager
        this.window.mapManager.updateFoundLocationsStyle();

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
        const visibleLocations = this.window.visibleLocations;
        const visibleCategories = this.window.visibleCategories;
        this.store.toggleCategories([]); // Force react update
        this.store.updateFoundLocationsCount(0); // Force react update
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
                if (curPresets[0]) {
                    for (let preset of curPresets) {
                        this.store.removePreset(preset.id);
                    }
                    this.store.addPreset(curPresets[0]);
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


module.exports = { MGMap }