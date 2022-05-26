const { MGApiFilter } = require("./filters");
const { MGMap } = require("./map/main");

class MGGuide {
    #apiFilter

    constructor(window) {
        this.map;
        this.document = window.document;

        window.isPro = true;

        this.mapFrame = document.querySelector("iframe[src*='https://mapgenie.io']");
        this.mapFrame.addEventListener("load", () => {
            this._setupMap().then(this.load.bind(this));
        });
        this.checkboxes = {};
        for (var checkbox of this.document.querySelectorAll(".check")) {
            this.checkboxes[checkbox.getAttribute("data-location-id")] = checkbox;
        }

        this.#apiFilter = new MGApiFilter(window.axios);
        this.#apiFilter.set = (key, id, _, str) => {
            if (key == "locations" && !this.map.store.state.map.locationsById[id]) {
                this.map.window.axios.put(str);
            }
        }
        this.#apiFilter.remove = (key, id, _, str) => {
            if (key == "locations" && !this.map.store.state.map.locationsById[id]) {
                this.map.window.axios.delete(str);
            }
        }
    }

    async _setupMap() {
        let mapWindow = this.mapFrame.contentWindow;
        
        mapWindow.map = mapWindow.map || {}
        await new Promise((resolve) => {
            let handle = setInterval(() => {
                if (mapWindow.map._loaded) {
                    clearInterval(handle);

                    if (mapWindow.Loaded) return;
                    mapWindow.Loaded = true;
                    this.map = new MGMap(mapWindow, true);

                    // Search for locations associated with the guide
                    let tables = this.document.querySelectorAll("table");
                    for (let table of tables) {
                        let row = table && table.querySelector("tbody > tr");
                        let checkboxes = row && row.querySelectorAll(".check") || [];
                        let categories = [];
                        for (let checkbox of checkboxes) {
                            let id = checkbox.getAttribute("data-location-id");
                            let catId = this.map.getCategoryId(id);
                            if (catId) categories.push(catId);
                        }
                        if (categories.length > 0) {
                            this.map.categories = categories;
                            break;
                        }
                    }

                    this.map.on("mark-locations", ({ id, marked }) => {
                        this._markInTable(id, marked||false); 
                    });

                    resolve();
                }
            }, 100);
        });
    }

    _checkboxSetChecked(checkbox, checked) {
        if (checkbox) {
            // if ((checked || false) != checkbox.checkbox) {
            //     checkbox.click();
            // }
            checkbox.checked = checked;
        }
    }

    _markInTable(id, found = true) {
        let checkbox = this.checkboxes[id];
        this._checkboxSetChecked(checkbox, found);
    }

    load() {
        if (!this.map) return Promise.resolve();

        return this.map.load().then(() => {
            this.map.showAll();

            // Mark all found locations in table
            let foundLocations = this.map.store.state.user.foundLocations;
            for (var checkbox of this.document.querySelectorAll(".check")) {
                let id = checkbox.getAttribute("data-location-id");
                this._checkboxSetChecked(checkbox, foundLocations[id]);
            }
        });
    }
}


module.exports = function () {
    if (!window.mg_pro_unlocker_loaded) {
        window.toastr.error("MapGeniePro Unlock:\nExtension was to slow set some options, please try again.");
    }

    let mgGuide = new MGGuide(window);
    mgGuide._setupMap().then(() => {
        mgGuide.load().then(() => {
            console.log("Guide hijacker loaded");
        });

        // Listen for page focus
        this.document.addEventListener('visibilitychange', () => {
            if (this.document.visibilityState == "visible") {
                mgGuide.load();
            }
        });

        window.addEventListener("mg:mapdata_changed", mgGuide.load.bind(mgGuide));
    });

    window.mgGuide = mgGuide;
}