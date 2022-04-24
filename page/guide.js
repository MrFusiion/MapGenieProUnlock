class MGGuide {
    #apiFilter

    constructor(window) {
        this.map;
        this.document = window.document;

        this.mapFrame = document.querySelector("iframe[src*='https://mapgenie.io']");
        this.mapFrame.addEventListener("load", () => {
            this._setupMap().then(this.load.bind(this));
        });
        this.checkboxes = {};

        this.#apiFilter = new MGApiFilter(window.axios);
        this.#apiFilter.set = this.#apiFilter.remove = () => void 0;
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

                    this.map.on("mark-locations", ({ id, marked }) => {
                        this._markInTable(id, marked||false); 
                    });

                    resolve();
                }
            }, 100);
        });
    }

    _markInTable(id, found = true) {
        let checkbox = this.checkboxes[id];
        if (!checkbox) {
            this.checkboxes[id] = checkbox = this.document.querySelector(`.check[data-location-id="${id}"]`);
        }
        if (checkbox) {
            if ((found || false) != checkbox.checked) {
                checkbox.click();
            }
        }
    }

    load() {
        if (!this.map) return Promise.resolve();

        return this.map.load().then(() => {
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
            this.map.showAll();

            for (let id in this.map.store.getState().map.locationsById) {
                this._markInTable(id, false);
            }
            // Mark all found locations in table
            for (var loc in this.map.store.getState().user.foundLocations) {
                this._markInTable(loc, true);
            }
        });
    }
}


if (!window.mg_pro_unlocker_loaded) {
    window.toastr.error("MapGeniePro Unlock:\nExtension was to slow set some options, please try again.");
}

// window.axios = axios;

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
});